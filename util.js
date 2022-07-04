function avg(xs) {
  return sum(xs) / xs.length;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Given a list of items that may contain duplicates,
// return an updated copy of the list without any duplicates.
function distinct(items){
  return items.filter((val, idx) => items.indexOf(val) === idx);
}

// Return a random item from a list.
function randNth(items){
  return items[Math.floor(Math.random()*items.length)];
}

// Return a shuffled copy of a list, leaving the original list unmodified.
function shuffle(items) {
  const newItems = [];
  for (let i = 0; i < items.length; i++) {
    newItems.push(items[i]);
  }
  for (let i = newItems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newItems[i], newItems[j]] = [newItems[j], newItems[i]];
  }
  return newItems;
}

function sum(xs) {
  return xs.reduce((a, b) => a + b);
}
