/// DataScript query rules

const queryRules = `[
[(eventSequence ?e1 ?e2)
 [?e1 "type" "event"] [?e2 "type" "event"]
 [(< ?e1 ?e2)]]
[(eventSequence ?e1 ?e2 ?e3)
 [?e1 "type" "event"] [?e2 "type" "event"] [?e3 "type" "event"]
 [(< ?e1 ?e2 ?e3)]]

[(viewsAsFriend ?c1 ?c2)
 [?ship "type" "ship"] [?ship "source" ?c1] [?ship "target" ?c2]
 [?ship "charge" ?charge] [(> ?charge 0)]]
[(viewsAsEnemy ?c1 ?c2)
 [?ship "type" "ship"] [?ship "source" ?c1] [?ship "target" ?c2]
 [?ship "charge" ?charge] [(< ?charge 0)]]

[(onesidedFriendship ?c1 ?c2)
 (viewsAsFriend ?c1 ?c2) (viewsAsEnemy ?c2 ?c1)]
[(onesidedEnmity ?c1 ?c2)
 (viewsAsEnemy ?c1 ?c2) (viewsAsFriend ?c2 ?c1)]
[(mutualFriendship ?c1 ?c2)
 (viewsAsFriend ?c1 ?c2) (viewsAsFriend ?c2 ?c1)]
[(mutualEnmity ?c1 ?c2)
 (viewsAsEnemy ?c1 ?c2) (viewsAsEnemy ?c2 ?c1)]

[(attractedTo ?c1 ?c2)
 [?ship "type" "ship"] [?ship "source" ?c1] [?ship "target" ?c2]
 [?ship "spark" ?spark] [(> ?spark 0)]]
[(repulsedBy ?c1 ?c2)
 [?ship "type" "ship"] [?ship "source" ?c1] [?ship "target" ?c2]
 [?ship "spark" ?spark] [(< ?spark 0)]]

[(onesidedAttraction ?c1 ?c2)
 (attractedTo ?c1 ?c2) (repulsedBy ?c2 ?c1)]
[(mutualAttraction ?c1 ?c2)
 (attractedTo ?c1 ?c2) (attractedTo ?c2 ?c1)]

[(childhoodFriends ?c1 ?c2)
 [?ship "type" "cfShip"] [?ship "source" ?c1] [?ship "target" ?c2]]

[(friendly ?c) [?c "trait" "friendly"]]
[(unfriendly ?c) [?c "trait" "unfriendly"]]
[(romantic ?c) [?c "trait" "romantic"]]
[(secretlyFamous ?c) [?c "trait" "secretlyFamous"]]
]`;

const allCharCharRelationshipRules = [
  "viewsAsFriend", "viewsAsEnemy",
  "onesidedFriendship", "onesidedEnmity", "mutualFriendship", "mutualEnmity",
  "attractedTo",
  "onesidedAttraction", "mutualAttraction",
  "childhoodFriends"
];

const allCharTraitRules = [
  "friendly", "unfriendly", "romantic", "secretlyFamous"
];


/// sim definition

const schema = {
  //exampleAttr: {':db/cardinality': ':db.cardinality/many'},
  // character traits
  trait:  {':db/cardinality': ':db.cardinality/many'},
  //curse:  {':db/cardinality': ':db.cardinality/many'},
  //value:  {':db/cardinality': ':db.cardinality/many'},
  // other stuff
  actor:  {':db/valueType': ':db.type/ref'},
  //cause:  {':db/valueType': ':db.type/ref'},
  source: {':db/valueType': ':db.type/ref'},
  target: {':db/valueType': ':db.type/ref'},
  //projectContributor: {':db/valueType': ':db.type/ref', ':db/cardinality': ':db.cardinality/many'},
  tag:    {':db/cardinality': ':db.cardinality/many'},
};

const allEventSpecs = [
  {eventType: 'getCoffeeWith', tags: ['friendly']},
  {eventType: 'physicallyAttack', tags: ['unfriendly', 'harms', 'major']},
  {eventType: 'disparagePublicly', tags: ['unfriendly', 'harms']},
  {eventType: 'sendPostcard', tags: ['friendly']},
  {eventType: 'insult', tags: ['unfriendly']},
  {eventType: 'insultDismissively', tags: ['unfriendly', 'highStatus']},
  {eventType: 'rejectSuperiority', tags: ['unfriendly', 'lowStatus']},
  {eventType: 'flirtWith_accepted', tags: ['romantic', 'positive']},
  {eventType: 'flirtWith_rejected', tags: ['romantic', 'negative', 'awkward']},
  {eventType: 'askOut_accepted', tags: ['romantic', 'positive', 'major']},
  {eventType: 'askOut_rejected', tags: ['romantic', 'negative', 'awkward', 'major']},
  //{eventType: 'propose_accepted', tags: ['romantic', 'positive', 'major']},
  //{eventType: 'propose_rejected', tags: ['romantic', 'negative', 'awkward', 'major']},
  //{eventType: 'breakUp', tags: ['romantic', 'negative', 'major']},
  {eventType: 'buyLunchFor', tags: ['friendly']},
  {eventType: 'inviteIntoGroup', tags: ['highStatus', 'friendly', 'helps']},
  {eventType: 'shunFromGroup', tags: ['highStatus', 'unfriendly', 'harms']},
  {eventType: 'apologizeTo', tags: ['friendly']},
  {eventType: 'begForFavor', tags: ['lowStatus']},
  {eventType: 'extortFavor', tags: ['highStatus']},
  {eventType: 'callInFavor', tags: ['highStatus']},
  {eventType: 'callInExtortionateFavor', tags: ['highStatus', 'harms']},
  //{eventType: 'playTheFool', tags: ['lowStatus', 'friendly']},
  //{eventType: 'playRoyalty', tags: ['highStatus', 'friendly']},
  //{eventType: 'neg', tags: ['highStatus', 'romantic', 'negative']},
  {eventType: 'askForHelp', tags: ['lowStatus', 'friendly']},
  {eventType: 'deferToExpertise', tags: ['career', 'lowStatus']},
  //{eventType: 'noticeMeSenpai', tags: ['lowStatus', 'romantic']},
  {eventType: 'deliberatelySabotage', tags: ['career', 'unfriendly', 'harms', 'major']},
  {eventType: 'collab:phoneItIn', tags: ['career', 'harms']},
  {eventType: 'collab:goAboveAndBeyond', tags: ['career', 'helps']},
];

// Add an event to the DB and return an updated DB.
function addEvent(db, event) {
  const transaction = [[':db/add', -1, 'type', 'event']];
  for (let attr of Object.keys(event)) {
    if (attr === 'tags') continue;
    transaction.push([':db/add', -1, attr, event[attr]]);
  }
  for (let tag of event.tags) {
    transaction.push([':db/add', -1, 'tag', tag]);
  }
  return datascript.db_with(db, transaction);
}

function getAllCharNames(db) {
  return datascript.q('[:find ?n :where [?c "charName" ?n]]', db).map(res => res[0]);
}

function getAllEvents(db) {
  const results = datascript.q(
    '[:find ?eid ?etype ?actor ?target \
      :where [?eid "eventType" ?etype] \
             [?eid "actor" ?a] [?eid "target" ?t] \
             [?a "charName" ?actor] [?t "charName" ?target]]',
  db);
  return results.sort((res1, res2) => res1[0] - res2[0]);
}

const testCharNames = [
  "Alex", "Bella", "Cam", "Devin", "Emily",
  "Fern", "Gavin", "Hazel", "Isla", "Jae",
  "Kev", "Lexi", "Mira", "Nora", "Oswald",
  "Peng", "Quinn", "Riva", "Sarah", "Tori",
  "Umair", "Vi", "Walt", "Xavier", "Yann", "Zach"
];


// populated by createDB()
// FIXME make createDB() fully referentially transparent again,
// ie return these datastructures alongside the DB itself
const charTraits = {};
const charCharShips = {};

function getCharCharShips(c1, c2) {
  const c1Ships = charCharShips[c1];
  return (c1Ships && c1Ships[c2]) || [];
}

function preferredShip(event) {
  if (event.tags.includes("friendly")) return "viewsAsFriend";
  if (event.tags.includes("unfriendly")) return "viewsAsEnemy";
  if (event.tags.includes("romantic") && event.tags.includes("negative")) return "onesidedAttraction";
  if (event.tags.includes("romantic") && event.tags.includes("positive")) return "mutualAttraction";
  // TODO also increase odds of romantic events of any kind when attractedTo exists
  return null;
}

function preferredTrait(event) {
  if (event.tags.includes("friendly")) return "friendly";
  if (event.tags.includes("unfriendly")) return "unfriendly";
  if (event.tags.includes("romantic")) return "romantic";
  return null;
}

function createDB() {
  let db = datascript.empty_db(schema);
  const charsToCreate = 20;

  // generate and add characters
  const allCharacterIDs = [];
  for (let i = 0; i < charsToCreate; i++) {
    const transaction = [
      [':db/add', -1, 'type', 'char'],
      [':db/add', -1, 'charName', testCharNames[i]],
      [":db/add", -1, "trait", randNth(["friendly", "unfriendly", "romantic", "normal", "normal"])]
    ];
    if (i === charsToCreate - 1) {
      transaction.push([":db/add", -1, "trait", "secretlyFamous"]);
    }
    db = datascript.db_with(db, transaction);
    allCharacterIDs.push(i+1);
  }

  // generate and add like/dislike relationships (mostly to test char/char relationship rules)
  const allCharIDPairs = [];
  for (const charA of allCharacterIDs) {
    const remainingCharIDs = allCharacterIDs.filter(id => id !== charA);
    for (const charB of remainingCharIDs) {
      allCharIDPairs.push([charA, charB]);
    }
  }
  const charIDPairsToAddShipsFor = shuffle(allCharIDPairs);
  for (let i = 0; i < charsToCreate * 2; i++) {
    const charge = randNth([-1, 1]);
    const spark = randNth([-1, 1]);
    const [source, target] = charIDPairsToAddShipsFor[i];
    const transaction = [
      [":db/add", -1, "type", "ship"],
      [":db/add", -1, "source", source],
      [":db/add", -1, "target", target],
      [":db/add", -1, "charge", charge],
      [":db/add", -1, "spark", spark],
    ];
    db = datascript.db_with(db, transaction);
    //console.log(`relationship: ${source} ${charge > 0 ? 'likes' : 'dislikes'} ${target}`);
  }

  // add a single reciprocal childhoodFriends relationship between a random character pair as well
  const [cf1, cf2] = randNth(allCharIDPairs);
  const childhoodFriendsTransaction = [
    [":db/add", -1, "type", "cfShip"],
    [":db/add", -1, "source", cf1],
    [":db/add", -1, "target", cf2],
    [":db/add", -2, "type", "cfShip"],
    [":db/add", -2, "source", cf2],
    [":db/add", -2, "target", cf1],
  ];
  db = datascript.db_with(db, childhoodFriendsTransaction);

  // cache info about char traits and relationships for faster precond checks and property generation
  for (const ruleName of allCharTraitRules) {
    const results = datascript.q(
      `[:find ?c1 :in $ % :where (${ruleName} ?c1)]`,
      db, queryRules
    );
    for (const [c1] of results) {
      charTraits[c1] = charTraits[c1] || [];
      charTraits[c1].push(ruleName);
    }
  }
  for (const ruleName of allCharCharRelationshipRules) {
    const results = datascript.q(
      `[:find ?c1 ?c2 :in $ % :where (${ruleName} ?c1 ?c2)]`,
      db, queryRules
    );
    for (const [c1, c2] of results) {
      charCharShips[c1] = charCharShips[c1] || {};
      charCharShips[c1][c2] = charCharShips[c1][c2] || [];
      charCharShips[c1][c2].push(ruleName);
    }
  }

  // generate and add events
  let eventsAdded = 0;
  while (eventsAdded < 1000) {
    // generate a random combination of event spec, actor and target
    const event = clone(randNth(allEventSpecs));
    event.actor = randNth(allCharacterIDs);
    event.target = randNth(allCharacterIDs.filter(id => id !== event.actor));

    // determine this particular event's chance of happening,
    // and roll a random number to determine whether it should be allowed to happen or not
    // based on this calculated chance
    let chanceOfHappening = 1;
    // is this event consistent with the actor's relationship to the target?
    const shipType = preferredShip(event);
    if (shipType) {
      const allShips = getCharCharShips(event.actor, event.target);
      const antiShipType = {
        viewsAsFriend: "viewsAsEnemy",
        viewsAsEnemy: "viewsAsFriend"
      }[shipType];
      const hasShip = allShips.includes(shipType);
      const hasAntiShip = allShips.includes(antiShipType);
      const consistencyWithCharRelationshipsFactor = hasAntiShip ? 0.1 : (hasShip ? 1 : 0.5);
      chanceOfHappening *= consistencyWithCharRelationshipsFactor;
    }
    // is this event consistent with the actor's traits?
    const traitType = preferredTrait(event);
    if (traitType) {
      const allTraits = charTraits[event.actor] || [];
      const antiTraitType = {
        friendly: "unfriendly",
        unfriendly: "friendly"
      }[traitType];
      const hasTrait = allTraits.includes(traitType);
      const hasAntiTrait = allTraits.includes(antiTraitType);
      const consistencyWithCharTraitsFactor = hasAntiTrait ? 0.1 : (hasTrait ? 1.5 : 0.5);
      chanceOfHappening *= consistencyWithCharTraitsFactor;
    }
    // is this event a Big Deal that shouldn't happen super often?
    if (event.tags.includes("major")) {
      chanceOfHappening *= 0.25;
    }
    // roll the dice to figure out if the event happens or not
    if (Math.random() >= chanceOfHappening) continue;

    // if we got this far, add the event to the DB
    db = addEvent(db, event);
    eventsAdded += 1;
  }

  return db;
}
