let appDB = createDB();
console.log(getAllCharNames(appDB));
const events = getAllEvents(appDB)
console.log(events);

for (let event of events) {
  const tbody = eventsTable.getElementsByTagName('tbody')[0];
  const tr = tbody.insertRow();
  for (let fact of event) {
    const td = tr.insertCell();
    td.innerText = fact;
  }
}

/*
function testCase1() {
  const results = datascript.q(
    '[:find ?e1 ?e2 ?e3 \
      :where [?e1 "actor" ?a] [?e2 "actor" ?a] [?e3 "actor" ?a] \
             [?e1 "target" ?t] [?e2 "target" ?t] [?e3 "target" ?t] \
             [(< ?e1 ?e2 ?e3)]]',
  appDB);

  console.log(results);

}

testCase1();
*/
