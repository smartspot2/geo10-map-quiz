window.onload = () => {
  let map_items = document.getElementsByClassName('map-item');
  let map_bounds = document.getElementsByClassName('map-item-bounds')
  for (let it of map_items) {
    it.onclick = () => {
      processClick(it);
    }
  }

  for (let it of map_bounds) {
    it.onclick = () => {
      processClick(it);
    }
  }

  initQuizItems();
  initQuiz();

  // Tooltip to show name
  let map_div = document.getElementsByClassName('map-div').item(0);
  let tooltip_div = document.getElementsByClassName('tooltip-div').item(0);
  map_div.onmouseover = () => {
    if (window.quiz.curName === '') return;
    tooltip_div.classList.remove('d-none');
  }

  map_div.onmouseout = () => {
    if (window.quiz.curName === '') return;
    tooltip_div.classList.add('d-none');
  }

  map_div.onmousemove = (event) => {
    if (window.quiz.curName === '') return;
    // console.log(event.clientX, event.clientY);
    tooltip_div.classList.remove('d-none');
    tooltip_div.style.cssText = `top: ${event.clientY - 25}px; left: ${event.clientX + 15}px;`;
  }

  for (let it of map_items) {
    addTextElement(it);
  }

  window.quiz.start = Date.now();
}

setInterval(() => {
  if (window.quiz.curName === '') return;
  let stopwatch_span = document.getElementById('stopwatch');
  let diff = Date.now() - window.quiz.start;
  let minute = Math.floor(diff / (1000 * 60)).toString();
  let second = Math.floor(diff / 1000 % 60).toString();
  stopwatch_span.innerText = `${minute}:${second.padStart(2, '0')}`;
}, 1000);

/**
 * Reset items and quiz time
 */
function restartQuiz(initItems) {
  for (let itemGroup of document.getElementsByClassName('map-item-group')) {
    itemGroup.classList.remove('incorrect');
    itemGroup.classList.remove('correct');
  }
  if (initItems) {
    window.QUIZ_ITEMS = initItems;
  } else {
    initQuizItems();
  }
  initQuiz();
  window.quiz.start = Date.now();
}

/**
 * Reset quiz variable and info
 */
function initQuiz() {
  let randIdx = Math.floor(Math.random() * window.QUIZ_ITEMS.length);
  let randName = window.QUIZ_ITEMS[randIdx];
  window.quiz = {
    curName: randName,
    done: [],
    numIncorrect: 0,
    itemsIncorrect: []
  }
  let question_span = document.getElementById('question-span');
  question_span.innerText = randName;
  let tooltip_content = document.getElementById('tooltip-content');
  tooltip_content.innerText = randName;
  let progress_span = document.getElementById('progress');
  progress_span.innerText = `0 / ${window.QUIZ_ITEMS.length}`;
  document.getElementsByClassName('map-review-btn')
      .item(0).classList.add('d-none');
}

/**
 * Reset quiz items
 */
function initQuizItems() {
  window.QUIZ_ITEMS = [];
  for (let item of document.getElementsByClassName('map-item')) {
    let label = item.getAttribute('aria-label');
    window.QUIZ_ITEMS.push(label);
  }
}

/**
 * Checks whether clicked item is correct
 * @param mapItem - clicked element
 */
function processClick(mapItem) {
  if (convertName(window.quiz.curName) === mapItem.id.replace('-BB', '')) {
    correctAnswer(mapItem);
  } else {
    incorrectAnswer(mapItem);
  }
  let progress_span = document.getElementById('progress');
  progress_span.innerText = `${window.quiz.done.length} / ${window.QUIZ_ITEMS.length}`;
}

/**
 * Process a correct answer
 * @param mapItem - clicked element
 */
function correctAnswer(mapItem) {
  mapItem.parentElement.classList.add('correct');
  nextItem();
}

/**
 * Generates a new item
 */
function nextItem() {
  window.quiz.numIncorrect = 0;
  window.quiz.done.push(window.quiz.curName);
  let question_span = document.getElementById('question-span');
  let items_left = window.QUIZ_ITEMS.filter(it => !window.quiz.done.includes(it))
  if (items_left.length === 0) {
    // Remove tooltip
    document.getElementsByClassName('tooltip-div')
        .item(0).classList.add('d-none');
    question_span.innerText = 'Finished.';
    window.quiz.curName = '';
    if (window.quiz.itemsIncorrect.length > 0) {
      document.getElementsByClassName('map-review-btn')
          .item(0).classList.remove('d-none');
    }
    return;
  }
  let randIdx = Math.floor(Math.random() * items_left.length);
  window.quiz.curName = items_left[randIdx];
  question_span.innerText = window.quiz.curName;
  let tooltip_content = document.getElementById('tooltip-content');
  tooltip_content.innerText = window.quiz.curName;
}

/**
 * Process an incorrect answer
 * @param mapItem - clicked element
 */
function incorrectAnswer(mapItem) {
  let parent = mapItem.parentElement;
  if (parent.classList.contains('incorrect') || parent.classList.contains('correct')) {
    return;
  }
  let textElement = parent.getElementsByClassName('map-item-text-group').item(0);
  textElement.classList.add('visible');
  parent.classList.add('incorrect');
  window.quiz.numIncorrect += 1;
  setTimeout(() => {
    parent.classList.remove('incorrect');
    textElement.classList.remove('visible');
  }, 1000);
  if (window.quiz.numIncorrect > 3) {
    highlightCurrent();
  }
  if (!window.quiz.itemsIncorrect.includes(window.quiz.curName)) {
    window.quiz.itemsIncorrect.push(window.quiz.curName);
  }
}

/**
 * Highlight current item
 */
function highlightCurrent() {
  let curItemGroup;
  findItemGroup:
      for (let el of document.getElementsByClassName('map-item-group')) {
        for (let child of el.children) {
          if (child.id === convertName(window.quiz.curName)) {
            curItemGroup = el;
            break findItemGroup;
          }
        }
      }
  if (curItemGroup.classList.contains('highlighted')) {
    return;
  }
  curItemGroup.classList.add('highlighted');
  setTimeout(() => {
    curItemGroup.classList.remove('highlighted');
  }, 1000);
}

/**
 * Converts readable name to ID
 * @param name - readable name
 * @returns {string} - ID name
 */
function convertName(name) {
  return name.toUpperCase().replaceAll(/[\s.']+/g, '-');
}

/**
 * Displays the text label for an item
 * @param mapItem - item to display text for
 */
function addTextElement(mapItem) {
  let parent = mapItem.parentElement;
  let textLocation = getTextLocation(parent);
  if (!textLocation) return;
  let textElementGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  textElementGroup.classList.add('map-item-text-group')
  let textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  textElement.textContent = parent.getElementsByClassName('map-item')
      .item(0).getAttribute('aria-label');
  textElement.setAttribute('x', textLocation.x);
  textElement.setAttribute('y', textLocation.y);
  textElement.classList.add('map-item-text');
  textElementGroup.appendChild(textElement);
  parent.appendChild(textElementGroup);
  let textBackground = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  let textBB = textElement.getBBox();
  textBackground.setAttribute('x', textLocation.x - textBB.width / 2 - 3);
  textBackground.setAttribute('y', textLocation.y - 3 * textBB.height / 4 - 3);
  textBackground.setAttribute('width', textBB.width + 6);
  textBackground.setAttribute('height', textBB.height + 6);
  textBackground.setAttribute('rx', "5");
  textBackground.setAttribute('ry', "5");
  textBackground.classList.add('map-item-text-background')
  textElementGroup.insertBefore(textBackground, textElement);
}

/**
 * Retrieve location of text in an item group
 * @param itemGroup - group that item is in
 * @returns {boolean|{x: *, y: *}} - false if invalid, coordinate pair if valid
 */
function getTextLocation(itemGroup) {
  let textElement = itemGroup.getElementsByClassName('map-item-text-loc');
  if (textElement.length > 0) {
    textElement = textElement.item(0);
    let coord = textElement.getAttribute('d').substring(1).split(',').map(v => parseFloat(v));
    return {x: coord[0], y: coord[1]};
  }
  return false;
}

/**
 * Restart quiz, but only use items that were wrong the previous time
 */
function reviewQuiz() {
  restartQuiz(window.quiz.itemsIncorrect);
}
