window.onload = () => {
  window.quiz = new Quiz();

  // Tooltip to show name
  let map_div = document.getElementsByClassName('map-div').item(0);
  let tooltip_div = document.getElementsByClassName('tooltip-div').item(0);
  map_div.onmouseover = () => {
    if (!window.quiz.curItem) return;
    tooltip_div.classList.remove('d-none');
  }

  map_div.onmouseout = () => {
    if (!window.quiz.curItem) return;
    tooltip_div.classList.add('d-none');
  }

  map_div.onmousemove = (event) => {
    if (!window.quiz.curItem) return;
    tooltip_div.classList.remove('d-none');
    tooltip_div.style.cssText = `top: ${event.clientY - 25}px; left: ${event.clientX + 15}px;`;
  }
}

class Quiz {
  /**
   * Map of id to object
   * @type {Map<string,MapItem>}
   */
  mapItems = new Map();
  /**
   * All possible items in the quiz
   * @type {MapItem[]}
   */
  quizItems = [];
  /**
   * Current quiz item, as a `MapItem` object
   * @type {MapItem}
   */
  curItem = null;
  /**
   * Map items that have already been found
   * @type {MapItem[]}
   */
  done = [];
  /**
   * Current number of consecutive incorrect clicks
   * @type {number}
   */
  numIncorrect = 0;
  /**
   * Items that have not been found on the first try
   * @type {MapItem[]}
   */
  itemsIncorrect = [];
  /**
   * Time of quiz start
   * @type {number}
   */
  start = 0;

  constructor() {
    this.createMapItems();

    this.initClickHandlers();
    this.restartQuiz();

    this.start = Date.now();
  }

  /**
   * Converts HTML elements to a `MapItem` object wrapper for ease
   */
  createMapItems() {
    let mapItemGroups = document.getElementsByClassName('map-item-group');
    for (let mapItemGroup of mapItemGroups) {
      let group = new MapItem(mapItemGroup);
      this.mapItems.set(group.id, group);
    }
  }

  /**
   * Initializes click handlers for map items and bounds
   */
  initClickHandlers() {
    for (let mapItem of this.mapItems.values()) {
      mapItem.setClickHandler(this.processClick, mapItem.id);
    }
  }

  /**
   * Resets quiz items
   */
  initQuizItems() {
    this.quizItems = [];
    for (let item of this.mapItems.values()) {
      this.quizItems.push(item);
    }
  }

  /**
   * Resets quiz variable and info
   */
  initQuiz() {
    let randIdx = Math.floor(Math.random() * this.quizItems.length);
    let randItem = this.quizItems[randIdx];

    this.curItem = randItem;
    this.done = [];
    this.numIncorrect = 0;
    this.itemsIncorrect = [];

    let question_span = document.getElementById('question-span');
    question_span.innerText = randItem.displayName;
    let tooltip_content = document.getElementById('tooltip-content');
    tooltip_content.innerText = randItem.displayName;
    let progress_span = document.getElementById('progress');
    progress_span.innerText = `0 / ${this.quizItems.length}`;
    document.getElementsByClassName('map-review-btn')
        .item(0).classList.add('d-none');
  }

  /**
   * Restart quiz with an optional initial quiz item array
   * @param {MapItem[]} init - optional initial quiz item array
   */
  restartQuiz(init = undefined) {
    for (let mapItem of this.mapItems.values()) {
      mapItem.reset();
    }
    if (init) {
      this.quizItems = init;
    } else {
      this.initQuizItems();
    }
    this.initQuiz();
    this.start = Date.now();

    // Start stopwatch
    clearInterval(window.stopwatch);
    let stopwatch_span = document.getElementById('stopwatch');
    stopwatch_span.innerText = '0:00';
    window.stopwatch = setInterval(() => {
      if (!window.quiz.curItem) return;
      let diff = Date.now() - window.quiz.start;
      let minute = Math.floor(diff / (1000 * 60)).toString();
      let second = Math.floor(diff / 1000 % 60).toString();
      stopwatch_span.innerText = `${minute}:${second.padStart(2, '0')}`;
    }, 1000);
  }

  reviewQuiz() {
    this.restartQuiz(this.itemsIncorrect);
  }

  /**
   * Checks whether clicked item is correct
   * @param {string} mapItem - clicked element
   */
  processClick = (mapItem) => {
    let mapItemObj = this.mapItems.get(mapItem);
    if (!this.curItem) {
      mapItemObj.highlight();
      return;
    }
    if (mapItemObj.displayName === this.curItem.displayName) {
      mapItemObj.correct();
      this.nextItem();
    } else {
      mapItemObj.incorrect();
      this.numIncorrect++;
      if (this.numIncorrect > 3) {
        this.highlightCurrent();
      }
      if (!this.itemsIncorrect.includes(this.curItem)) {
        this.itemsIncorrect.push(this.curItem);
      }
    }
    let progress_span = document.getElementById('progress');
    progress_span.innerText = `${this.done.length} / ${this.quizItems.length}`;
  }

  /**
   * Generates a new item
   */
  nextItem = () => {
    this.numIncorrect = 0;
    this.done.push(this.curItem);
    let question_span = document.getElementById('question-span');
    let items_left = this.quizItems.filter(it => !this.done.includes(it));
    if (items_left.length === 0) {
      // Remove tooltip
      document.getElementsByClassName('tooltip-div')
          .item(0).classList.add('d-none');
      question_span.innerText = 'Finished.';
      this.curItem = null;
      if (this.itemsIncorrect.length > 0) {
        // Make review button visible
        document.getElementsByClassName('map-review-btn')
            .item(0).classList.remove('d-none');
      }
      // Stop stopwatch
      clearInterval(window.stopwatch);
    } else {
      let randIdx = Math.floor(Math.random() * items_left.length);
      this.curItem = items_left[randIdx];
      question_span.innerText = this.curItem.displayName;
      let tooltip_content = document.getElementById('tooltip-content');
      tooltip_content.innerText = this.curItem.displayName;
    }
  }

  /**
   * Highlights the current item in case of too many mistakes
   */
  highlightCurrent = () => {
    let curMapItem = this.mapItems.get(this.curItem.id);
    curMapItem.highlight();
  }
}

class MapItem {
  /**
   * SVG group for all elements relating to the item
   * @type {SVGGElement}
   */
  mapItemGroup = null;
  /**
   * SVG item
   * @type {Element}
   */
  mapItem = null;
  /**
   * SVG bounds
   * @type {Element}
   */
  mapItemBounds = null;
  /**
   * SVG text tooltip for map item
   * @type {SVGTextElement}
   */
  mapItemText = null;
  /**
   * SVG group of the text tooltip
   * @type {SVGGElement}
   */
  mapItemTextGroup = null;
  /**
   * Location of the text box
   * @type {{x:number, y:number}}
   */
  textLoc = {};
  /**
   * Map item id
   * @type {string}
   */
  id = '';
  /**
   * Map item display name
   * @type {string}
   */
  displayName = '';

  /**
   * Movement handler object for the map item
   * @type {Movement}
   */
  movementHandler = null;

  /**
   * Creates a wrapper for a map item
   * @param {SVGGElement} mapItemGroup
   */
  constructor(mapItemGroup) {
    this.mapItemGroup = mapItemGroup;

    let mapItemClass = mapItemGroup.getElementsByClassName('map-item');
    let mapItemBoundsClass = mapItemGroup.getElementsByClassName('map-item-bounds');
    let mapItemTextLoc = mapItemGroup.getElementsByClassName('map-item-text-loc');

    console.assert(mapItemClass.length > 0,
        `Map item group ${mapItemGroup.id} does not contain a map item!`);
    console.assert(mapItemTextLoc.length > 0,
        `Map item group ${mapItemGroup.id} does not contain a text location!`);

    console.assert(mapItemClass.length < 2,
        `Map item group ${mapItemGroup.id} contains more than one map item!`
        + ` (got ${mapItemClass.length})`);
    console.assert(mapItemBoundsClass.length < 2,
        `Map item group ${mapItemGroup.id} contains more than one map item bounds!`
        + ` (got ${mapItemClass.length})`);

    if (mapItemClass.length > 0) {
      this.mapItem = mapItemClass.item(0);
      this.id = this.mapItem.id;
      this.displayName = this.mapItem.getAttribute('aria-label');
    }
    if (mapItemBoundsClass.length > 0) {
      this.mapItemBounds = mapItemBoundsClass.item(0);
    }
    if (mapItemTextLoc.length > 0) {
      let textLocArray = mapItemTextLoc.item(0).getAttribute('d')
          .substring(1).split(',').map(v => parseFloat(v));
      this.textLoc = {x: textLocArray[0], y: textLocArray[1]};
      this.addTextElement();
    }
  }

  /**
   * Sets the handler on map item click
   * @param {function} callback - callback
   * @param args - arguments to pass to callback function
   */
  setClickHandler(callback, ...args) {
    let grouped = [];
    if (this.mapItem) {
      grouped.push(this.mapItem);
    }
    if (this.mapItemBounds) {
      grouped.push(this.mapItemBounds);
    }
    this.movementHandler = new Movement(...grouped);
    this.movementHandler.setOnClick(() => callback(...args));
  }

  /**
   * Resets highlighting and colors for this map item
   */
  reset() {
    this.mapItemGroup.classList.remove('incorrect');
    this.mapItemGroup.classList.remove('correct');
    this.mapItemGroup.classList.remove('highlight');
  }

  /**
   * Processes a correct click
   */
  correct() {
    this.mapItemGroup.classList.add('correct');
  }

  /**
   * Processes an incorrect click
   */
  incorrect() {
    if (this.mapItemGroup.classList.contains('incorrect') || this.mapItemGroup.classList.contains('correct')) {
      return;
    }
    this.mapItemTextGroup.classList.add('visible');
    this.mapItemGroup.classList.add('incorrect');
    setTimeout(() => {
      this.mapItemGroup.classList.remove('incorrect');
      let viewTextChecked = document.getElementById('checkbox-view-text').checked;
      if (!viewTextChecked) {  // don't remove if it was visible beforehand
        this.mapItemTextGroup.classList.remove('visible');
      }
    }, 1000);
  }

  /**
   * Highlights the current map item
   */
  highlight() {
    if (this.mapItemGroup.classList.contains('highlighted')) {
      return;
    }
    this.mapItemGroup.classList.add('highlighted');
    setTimeout(() => {
      this.mapItemGroup.classList.remove('highlighted');
    }, 1000);
  }

  /**
   * Displays the text label for an item
   */
  addTextElement() {
    if (!this.textLoc) return;
    let textElementGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    textElementGroup.classList.add('map-item-text-group')
    let textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textElement.textContent = this.mapItemGroup.getElementsByClassName('map-item')
        .item(0).getAttribute('aria-label');
    textElement.setAttribute('x', this.textLoc.x);
    textElement.setAttribute('y', this.textLoc.y);
    textElement.classList.add('map-item-text');
    textElementGroup.appendChild(textElement);
    this.mapItemGroup.appendChild(textElementGroup);
    let textBackground = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    let textBB = textElement.getBBox();
    textBackground.setAttribute('x', this.textLoc.x - textBB.width / 2 - 3);
    textBackground.setAttribute('y', this.textLoc.y - 3 * textBB.height / 4 - 3);
    textBackground.setAttribute('width', textBB.width + 6);
    textBackground.setAttribute('height', textBB.height + 6);
    textBackground.setAttribute('rx', "5");
    textBackground.setAttribute('ry', "5");
    textBackground.classList.add('map-item-text-background')
    textElementGroup.insertBefore(textBackground, textElement);
    this.mapItemText = textElement;
    this.mapItemTextGroup = textElementGroup;
  }
}

window.stopwatch = -1;

function viewText(el) {
  for (let textGroup of document.getElementsByClassName('map-item-text-group')) {
    if (el.checked) {
      textGroup.classList.add('visible');
    } else {
      textGroup.classList.remove('visible');
    }
  }
}

function restartQuiz() {
  window.quiz.restartQuiz();
}

function reviewQuiz() {
  window.quiz.reviewQuiz();
}
