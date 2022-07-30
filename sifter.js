/*
High-level approach:
1. Run the simulation for a while, to put a bunch of events in the DB
2. For each sifting pattern:
   * Retrieve all matches
   * Enrich each match with its properties
   * For each property:
     - Count up how many of the matches that we've seen have this property
     - Determine the overall _likelihood_ that a randomly selected match
       against this pattern would have this property
3. Use likelihoods of individual properties to determine the overall likelihood of each _match_
   (e.g., by averaging them, taking the lowest, etc)
*/


/// define which properties are worth considering

function generatePropertiesForMatch(match, db) {
  const properties = [];

  // generate simple eventType and tag properties
  for (let i = 0; i < match.events.length; i++) {
    const eventType = match.events[i].eventType;
    properties.push(`eventHasEventType_e${i}_${eventType}`);
    for (let tag of match.events[i].tags) {
      properties.push(`eventHasTag_e${i}_${tag}`);
    }
  }

  // generate character-related properties
  for (const lvar1 of match.charLvars) {
    // traits
    const c1 = match.bindings[lvar1];
    for (const traitName of charTraits[c1] || []) {
      properties.push(`charHasTrait_${lvar1}_${traitName}`);
    }
    // relationships
    for (const lvar2 of match.charLvars) {
      if (lvar1 === lvar2) continue;
      const c2 = match.bindings[lvar2];
      if (c1 === c2) {
        properties.push(`sameChar_${lvar1}_${lvar2}`);
        continue; // skip ahead; a char will never have relationships with themself
      }
      if (!charCharShips[c1]) continue; // skip ahead if c1 has no relationships of note
      for (const ruleName of charCharShips[c1][c2] || []) {
        properties.push(`charsAreRelated_${ruleName}_${lvar1}_${lvar2}`);
      }
    }
  }

  // generate context lvar properties
  for (const lvar of match.contextLvars) {
    properties.push(`context_${lvar}_${match.bindings[lvar]}`);
  }

  return properties;
}


/// sifting patterns

const allSiftingPatterns = {
  establishFriendship:
  `[?e1 "tag" "friendly"] [?e1 "actor" ?c1] [?e1 "target" ?c2]
   [?e2 "tag" "friendly"] [?e2 "actor" ?c2] [?e2 "target" ?c1]
   [(< ?e1 ?e2)]`,

  romanticFailureThenSuccess:
  `[?e1 "actor" ?c1] [?e1 "tag" "negative"] [?e1 "tag" "romantic"]
   [?e2 "actor" ?c1] [?e2 "tag" "negative"] [?e2 "tag" "romantic"] [(< ?e1 ?e2)]
   [?e3 "actor" ?c1] [?e3 "tag" "positive"] [?e3 "tag" "romantic"] [(< ?e2 ?e3)]
   [?e1 "target" ?c2] [?e2 "target" ?c3] [?e3 "target" ?c4]`,

  revengeAlliance:
  `[?e1 "actor" ?cRevengeTarget] [?e1 "target" ?c1] [?e1 "tag" "harms"]
   [?e2 "actor" ?cRevengeTarget] [?e2 "target" ?c2] [?e2 "tag" "harms"] [(< ?e1 ?e2)]
   [?e3 "actor" ?c1] [?e3 "target" ?c2] [?e3 "tag" "friendly"] [(< ?e2 ?e3)]
   [?e4 "actor" ?c1] [?e4 "target" ?cRevengeTarget] [?e4 "tag" "unfriendly"] [(< ?e3 ?e4)]`,

  statusReversal:
  `[?e1 "actor" ?c1] [?e1 "target" ?c2] [?e1 "tag" "lowStatus"]
   [?e2 "actor" ?c1] [?e2 "target" ?c2] [?e2 "tag" "lowStatus"] [(< ?e1 ?e2)]
   [?e3 "actor" ?c1] [?e3 "target" ?c2] [?e3 "tag" "highStatus"] [(< ?e2 ?e3)]`,

  cantCatchABreak:
  `[?e1 "target" ?cProtag] [?e1 "tag" "harms"]
   [?e2 "target" ?cProtag] [?e2 "tag" "harms"] [(< ?e1 ?e2)]
   [?e3 "target" ?cProtag] [?e3 "tag" "harms"] [?e3 "tag" "major"] [(< ?e2 ?e3)]
   [?e1 "actor" ?c1] [?e2 "actor" ?c2] [?e3 "actor" ?c3]`
};


/// utility functions used in the main sifting code

function findLvars(s) {
  return s.match(/\?[a-zA-Z_][a-zA-Z0-9_]*/g).map(lvar => lvar.substring(1));
}

function getEventEntity(eventID, db) {
  // get singular event properties
  const mainQuery = `[:find ?eventType ?actor ?target :in $ ?eid
                      :where [?eid "eventType" ?eventType]
                             [?eid "actor" ?actor]
                             [?eid "target" ?target]]`;
  const mainResults = datascript.q(mainQuery, db, eventID);
  const [eventType, actor, target] = mainResults[0];

  // get event tags
  const tagsQuery = `[:find ?tag :in $ ?eid :where [?eid "tag" ?tag]]`;
  const tagsResults = datascript.q(tagsQuery, db, eventID);
  const tags = tagsResults.map(result => result[0]);

  // add event to events
  return {id: eventID, eventType, actor, target, tags};
}


/// main sifting code

const propertyCountsByPattern = {};
const scoredMatchesByPattern = {};

for (const patternName of Object.keys(allSiftingPatterns)) {
  // add model storage for this pattern
  propertyCountsByPattern[patternName] = {};

  // get and "compile" the pattern
  const pattern = allSiftingPatterns[patternName];
  const lvars = distinct(findLvars(pattern));
  const query = `[:find ${lvars.map(lvar => "?" + lvar).join(" ")} :in $ % :where ${pattern}]`;

  // classify lvars by what kind of thing they refer to
  // FIXME this relies on fragile naming conventions, but it doesn't have to
  const eventLvars = lvars.filter(lvar => lvar.startsWith("e"));
  const charLvars = lvars.filter(lvar => lvar.startsWith("c"));
  const contextLvars = lvars.filter(lvar => !lvar.startsWith("c") && !lvar.startsWith("e"));

  // run the sifting pattern, calculate properties for each match,
  // and learn property counts from the calculated sets of properties
  const matches = datascript.q(query, appDB, queryRules).map(result => {
    // wrap up lvars with their values into a map of bindings
    const bindings = {};
    for (let i = 0; i < lvars.length; i++) {
      bindings[lvars[i]] = result[i];
    }

    // get full event data for the backbone event sequence
    const eventIDs = eventLvars.map(lvar => bindings[lvar]).sort((a, b) => a - b);
    const events = eventIDs.map(eventID => getEventEntity(eventID, appDB));

    // wrap up all the info we've calculated into a match object,
    // which we can then use to generate properties
    const match = {
      patternName, result, bindings,
      eventIDs, events,
      eventLvars, charLvars, contextLvars
    };

    // calculate properties and add them to the complete match
    const properties = generatePropertiesForMatch(match, appDB);
    match.properties = properties;

    // update property counts based on this match's properties
    const propCounts = propertyCountsByPattern[patternName];
    for (const prop of properties) {
      propCounts[prop] = propCounts[prop] || 0;
      propCounts[prop] += 1;
    }

    // return the match
    return match;
  });
  console.log(patternName, matches);

  // score matches according to the likelihood of their properties
  for (const match of matches) {
    // get the match's properties and associate each one with its likelihood
    const propCounts = propertyCountsByPattern[patternName];
    const props = match.properties;
    const likelihood = (prop => propCounts[prop] / matches.length);
    const propsWithLikelihoods = props.map(prop => [prop, likelihood(prop)]);

    // sort props by their likelihood, least likely first
    propsWithLikelihoods.sort((a, b) => a[1] - b[1]);
    match.propsWithLikelihoods = propsWithLikelihoods;

    // generate an overall property likelihood score for this match
    const avgPropLikelihood = avg(propsWithLikelihoods.map(x => x[1]));
    match.score = avgPropLikelihood;
  }
  matches.sort((a, b) => a.score - b.score);
  scoredMatchesByPattern[patternName] = matches;
}
