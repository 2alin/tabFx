

/*
  Setting presets Default
*/

var presetsDefault = {
  modeActive: "auto",
  // presets object version, independent of extension's version
  version: "1.0",
  auto: {
    startIsOn: true,
    startValue: "",
    endIsOn: true,
    // next properties are used to filter the trailing part of the url
    //splitChars are used to define a series of key Fields to consider
    splitChars: {'$': true, '.': true, '#': false, '?': false},
    //keyWord is assigned by the used as another field to filter consider
    keyWord: {value: "", isOn: false},
    includedWords: [],
    excludedWords: []
  },
  search: {
    query: ""
  }
}

function validate(presetsTest){
  //verify existence of version property
  if (!presetsTest.hasOwnProperty("version")){
    return false;
  } else if(presetsTest.version != presetsDefault.version){
    return false;
  }
  return true;

}



/*
save and restore presets options from local storage
*/

var presets;

function savePresets(){
  browser.storage.local.set({
    presetsLocal: presets
  });
}

function restorePresets() {

  function setPresets(result) {
    if(result.hasOwnProperty("presetsLocal") && validate(result.presetsLocal)){
      // there's presets saved locally already
      console.log("presets were restored successfully");
      presets = result.presetsLocal;
    } else{
      // no presets saved yet or failed validity
      console.log("presets failed to restore, reset them");
      presets = presetsDefault;
    }
    savePresets();
    updateAutoPreset();
    fillAutoResults();
  }

  function onError(error){
    console.log('Error: ' + error);
  }

  var getting = browser.storage.local.get("presetsLocal");
  getting.then(setPresets, onError);
}

// restore presets when document loads
document.addEventListener("DOMContentLoaded", restorePresets);



/*
  Nav Bar actions and mode form variables
*/

var autoBtn = document.querySelector('#auto-btn');
var searchBtn = document.querySelector('#search-btn');
var autoForm = document.querySelector('form.auto');
var searchForm = document.querySelector('form.search');
var autoTabs = document.querySelector('#auto-tabs');
var searchTabs = document.querySelector('#search-tabs');
var autoHelper = document.querySelector("div.helper.auto")
var searchHelper = document.querySelector("div.helper.search");

autoBtn.addEventListener("click", () => {
  // autoBtn.className = "active";
  // searchBtn.className = "";
  presets.modeActive = "auto";
  updatePopup();
  savePresets();
});
searchBtn.addEventListener("click", () => {
  // searchBtn.className = "active";
  // autoBtn.className = "";
  presets.modeActive = "search";
  updatePopup();
  savePresets();
});


/*
  binding checkboxes to preset properties
*/

var startSelect= document.querySelector('#start-select');
var endSelect= document.querySelector('#end-select');
// adding event listeners and update object values
startSelect.addEventListener('click', () => {
  presets.auto.startIsOn = startSelect.checked;
  fillAutoResults();
  savePresets();
  
});  
endSelect.addEventListener('click', () => {
  presets.auto.endIsOn= endSelect.checked;
  fillAutoResults();
  savePresets();
});  


/*
  binding search text form to preset properties
*/

var searchField = document.querySelector('#search-query');


//adding event listener when typing
searchField.addEventListener('input', () => {
  
  presets.search.query = searchField.value.toLowerCase().trim();
  savePresets();
  
  // calling find tabs algorithm
  searchByText();
})


/*
  binding backspace button to its proper action
*/

var backspaceBtn = document.querySelector('#backspace');

backspaceBtn.addEventListener('click', () => {
  searchField.value = "";
  presets.search.query = "";
  savePresets();
  searchByText();
  searchField.focus();
});


/*
  binding up/down arrow keys for list navigation
*/

document.addEventListener('keydown', (e) => {
  let keyCode = e.keyCode;
  let listTabsActive = document.querySelector('div.list-tabs.active');

  if(!listTabsActive.classList.contains('empty')){
    let list = document.querySelector('div.list-tabs.active ol');
    let firstElement = list.firstChild;
    let lastElement = list.lastChild;
    let focusedElement = document.activeElement;
    if (keyCode === 38){
      // UP key pressed
      e.preventDefault(); //prevent scrollbars to move with arrow keys
      if (focusedElement === firstElement ){
        //current element is first in the list
        lastElement.focus();
      } else if (focusedElement.parentNode === list) {
        //current element is in the list, not first
        focusedElement.previousSibling.focus();
      } else {
        //current element is something not in the list
        lastElement.focus();
      }
    } else if (keyCode === 40){
      // UP key pressed
      e.preventDefault(); //prevent scrollbars to move with arrow keys
      if (focusedElement === lastElement ){
        //current element is last in the list
        firstElement.focus();
      } else if (focusedElement.parentNode === list) {
        //current element is in the list, not first
        focusedElement.nextSibling.focus();
      } else {
        //current element is something not in the list
        firstElement.focus();
      }
    }
  }

});


/*
retrieving trailing part of an url
*/

function endingURL(url){
  let ending = ""
  let re = new RegExp('(/[^/]*)$', 'i');
  if (re.test(url)){
    ending = re.exec(url)[0];
    //removing the first character '/'
    ending = ending.slice(1);
  } else if (url.startsWith("about:")) {
    ending = url.slice(6);
  }
  return ending;
}


/*
  update auto preset properties using active url
*/

async function updateAutoPreset(){
  let thisTab = (await browser.tabs.query({active:true, currentWindow:true}))[0];

  // retrieving auto start query
  if (thisTab.url.startsWith('http')) {
    // catching http and https urls
    let re = new RegExp('https*://([^/])+/', 'i');
    presets.auto.startValue = re.exec(thisTab.url)[0];
  } else {
    // catching 'about:', 'file:', etc urls
    let re = new RegExp('^([a-z]+:)', 'i');
    presets.auto.startValue = re.exec(thisTab.url)[0];
  }
  
  let ending = endingURL(thisTab.url);

  // getting splitter characters
  let splitChars = Object.keys(presets.auto.splitChars);
  presets.auto.includedWords = [];
  presets.auto.excludedWords = [];

  // retrieving trailing text (property) for every character
  // and classify them
  for (char of splitChars) {
    let property = "";
    let re;
    //find last index of char found
    let lastIndex = ending.lastIndexOf(char);
    switch(char){
      case '.': re = new RegExp('(\\.[^\\.\\$#\\?]*)'); break;
      case '$': re = new RegExp('(\\$[^\\.\\$#\\?]*)'); break;
      case '#': re = new RegExp('(#[^\\.\\$#\\?]*)'); break;
      case '?': re = new RegExp('(\\?[^\\.\\$#\\?]*)');

    }
    
    if (re.test(ending.slice(lastIndex))){
      property = re.exec(ending.slice(lastIndex))[0];
    }
    
    //splitting the properties found before
    //into two categories "endValuesIncluded"/"endValuesExcluded"
    if(property === ""){
      continue;
    }
    if (presets.auto.splitChars[char]){
      presets.auto.includedWords.push(property.toLowerCase());
    } else {
      presets.auto.excludedWords.push(property.toLowerCase());
    }
  }

  // classify keyword 
  let keyWordValue = presets.auto.keyWord.value;
  if(presets.auto.keyWord.isOn){
    if ( keyWordValue != ""){
      presets.auto.includedWords.push(keyWordValue.toLowerCase());
    }
  } else {
    if ( keyWordValue != ""){
      presets.auto.excludedWords.push(keyWordValue.toLowerCase());
    }
  }
  updatePopup();
}



/*
  update text fields and checkboxes in popup using presets
 */

function updatePopup() {
  
  if (presets.modeActive === 'auto'){
    ////////////////////////// 
    // auto mode activated //


    // set nav and form 'active' classes

    autoForm.classList.add('active');
    searchForm.classList.remove('active');
    autoTabs.classList.add('active');
    searchTabs.classList.remove('active');
    //set active nav button when doc loads
    autoBtn.classList.add('active');
    searchBtn.classList.remove('active');
    //remove remaining helpers
    searchHelper.classList.remove('active');

    //handling exception active autohelper
    if (autoTabs.classList.contains("empty")){
      autoHelper.classList.add('active');
    }
    


    // filling auto form //


    // start auxiliary text
    document.querySelector('#start').textContent = presets.auto.startValue;

    // end auxiliary text
    let includeText = "";
    for (word of presets.auto.includedWords){
      let finalWord = word;
      if (word.length > 8 ){
        finalWord = word.slice(0,6) + '...';
      }
      includeText += finalWord + ' '; 
    }
    document.querySelector('#include').textContent = includeText;

    //filling checkboxes
    startSelect.checked = presets.auto.startIsOn;
    endSelect.checked = presets.auto.endIsOn;

    // //updating filtered list
    // fillAutoResults();

    //focus html for arrow keys to scroll list inmediately
    window.focus();



  } else {
    ////////////////////////////
    // search mode activated //


    // set nav and form 'active' classes

    searchForm.classList.add('active');
    autoForm.classList.remove('active');
    searchTabs.classList.add('active');
    autoTabs.classList.remove('active');
    //set active nav button when doc loads
    searchBtn.classList.add('active');
    autoBtn.classList.remove('active');
    //remove remaining helpers
    autoHelper.classList.remove('active');

    // restore query search from presets
    searchField.value = presets.search.query;
  
    // fill search mode tab list
    searchByText();

    //focus searchField for arrow keys to scroll list inmediately
    searchField.focus();
  }

  
}



/*
  fill 'matching tabs' result list
*/

async function fillAutoResults(){
  
  let foundTabs = await browser.tabs.query({});
  let tempoTabs;
  // first filter: 'leading' query
  tempoTabs = [];
  if (presets.auto.startIsOn && (presets.auto.startValue != "")) {
    for (let tab of foundTabs){
      if (tab.url.startsWith(presets.auto.startValue)){
        tempoTabs.push(tab);
      }
    }
    foundTabs = tempoTabs;
  }
  
  // second filter: 'trailing' query
  tempoTabs = [];
  if (presets.auto.endIsOn && (presets.auto.includedWords.length != 0)){
    for (let tab of foundTabs){
      let ending = endingURL(tab.url).toLowerCase();
      
      for (let word of presets.auto.includedWords){
        
        if (ending.includes(word)){
          tempoTabs.push(tab);
          
          break;
        }
      }
    }
    foundTabs = tempoTabs;
  }
  

  // displays a list of tab titles with ids matching
  // the tab id, as well as adding listener to them that
  // will change to its respective tab when click over them
  //
  // For a reason, I got the items in 'ol' un-numbered, so 
  // I'm using 'k' as a counter
  let resultsBox = document.querySelector("#auto-tabs");
  resultsBox.innerHTML = "";

  let resultsList = document.createElement("ol");

  let thisTab = (await browser.tabs.query({active:true, currentWindow:true}))[0];
  
  let k = 0; // counter for list item

  for (let tab of foundTabs){
    let tabItem = document.createElement('li');
    let itemCounter = document.createElement('span');
    let favIcon = document.createElement('span');
    let titleTab = document.createElement('span');
    let closeTab = document.createElement('span');
    
    k++; // counter for list item
    itemCounter.textContent = k + '.'; // fill itemCounter

    // fill favicon
    if(tab.favIconUrl){
      if(tab.favIconUrl.startsWith("http")){
        favIcon.style.backgroundImage = 'url(' + tab.favIconUrl +')';
      }
    }

    titleTab.textContent = tab.title// fill tab title
    
    //prepare class button and add event listener
    closeTab.classList.add('close');
    closeTab.id = tab.id; //keep track of the tab id 
    closeTab.addEventListener('click', (e) =>{
      // prevent propagating and  moving to another tab
      e.stopPropagation(); 
      //removing tab
      let tabId = Number(e.target.id);
      browser.tabs.remove(tabId);
      //removing the list item in the list
      e.target.parentNode.remove();
      //renumerating the list 
      renumerate(autoTabs);
    });

    // form list item
    tabItem.appendChild(itemCounter); 
    tabItem.appendChild(favIcon);
    tabItem.appendChild(titleTab);
    tabItem.appendChild(closeTab);


    resultsList.appendChild(tabItem); //append to the list

    // assign tab id and window ID as id and class of tabItem
    // in order to inherit such values
    tabItem.id = tab.id;
    tabItem.className =tab.windowId;
    
    //add special class to item related to active tab
    if (tab.id == thisTab.id ){
      tabItem.className = 'active';
    }

    //adding listener for click events
    tabItem.addEventListener('click', changeTab);

    //change tab function
    function changeTab(e) {
      let id;
      let windowId;
      if (e.target.nodeName.toLowerCase() === "li"){
        id = Number(e.target.id);
        windowId = Number(e.target.className);
      } else {
        windowId = Number(e.target.parentNode.className);
        id = Number(e.target.parentNode.id);
      }

      //handling same tab as active
      if (id == thisTab.id){
        window.close(); // already in the selected tab
        return;
      }

      browser.windows.update(windowId, {focused: true});
      browser.tabs.update(id, {active: true});
      window.close();
    }

    //adding attribute for arrow key focus
    tabItem.setAttribute("tabindex", "1");

    //adding listener for enter key down
    tabItem.addEventListener('keydown', (e) => {
      if (e.keyCode === 13){
        changeTab(e);
      }
    });
  
  }

  resultsBox.appendChild(resultsList);
  
  // Dynamic list counter width
  // resultsBox.className = "";
  resultsBox.classList.remove('empty');
  resultsBox.classList.remove('one-digit');
  resultsBox.classList.remove('two-digits');
  resultsBox.classList.remove('three-digits');
  if (k === 0){
    resultsBox.classList.add('empty');
  } else if (k < 10){
    resultsBox.classList.add('one-digit');
  } else if(k < 100){
    resultsBox.classList.add('two-digits');
  } else {
    resultsBox.classList.add('three-digits');
  }

  // if list is empty, activate auto helper window
  if(resultsBox.classList.contains('empty') && presets.modeActive === "auto"){
    autoHelper.classList.add('active');
  } else{
    autoHelper.classList.remove('active');
  }

}



/* 
  update popup content in case tab changes (using keyboard)
  when popup was opened
*/
browser.tabs.onActivated.addListener(() => {
  updateAutoPreset();
  fillAutoResults();
} );


/*
  ending settings popup window
*/

// open settings popup when clicking settings button
var settingsBtn = document.querySelector('#ending-gear');
var settingsPopup = document.querySelector('#settings-popup');
settingsBtn.addEventListener('click',() => {
  updateSettingsForm();
  settingsPopup.className = 'visible';
});
//handles save button
var settingsForm = document.querySelector('#settings-form');
settingsForm.addEventListener('submit', ()=> {
  settingsPopup.className = "";
  updateSettingsPreset();
  savePresets();
  updateAutoPreset();
  fillAutoResults();
  
});
//handles reset button
settingsForm.addEventListener('reset', (e) => {
  e.preventDefault();
  presets = presetsDefault;
  savePresets();
  updateAutoPreset();
  fillAutoResults();
  updateSettingsForm();
});

function updateSettingsForm(){
  document.querySelector('#dollar').checked = presets.auto.splitChars['$'];
  document.querySelector('#dot').checked = presets.auto.splitChars['.'];
  document.querySelector('#sharp').checked = presets.auto.splitChars['#'];
  document.querySelector('#question').checked = presets.auto.splitChars['?'];
  document.querySelector('#keyword-text').value = presets.auto.keyWord.value;
  document.querySelector('#keyword-check').checked = presets.auto.keyWord.isOn;
}
function updateSettingsPreset(){
  presets.auto.splitChars['$'] = settingsForm.elements['dollar'].checked;
  presets.auto.splitChars['.'] = settingsForm.elements['dot'].checked;
  presets.auto.splitChars['#'] = settingsForm.elements['sharp'].checked;
  presets.auto.splitChars['?'] = settingsForm.elements['question'].checked;
  presets.auto.keyWord.value = settingsForm.elements['keyword-text'].value.trim();
  presets.auto.keyWord.isOn = settingsForm.elements['keyword-check'].checked;
}


/* 
search tabs by text algorithm
*/

async function searchByText() {
  let searchText = presets.search.query;
  let allTabs = await browser.tabs.query({});
  let resultTabs = []

  // take out trailing commas, to avoid  showing the whole
  // list everytime we add an OR word
  if (searchText.endsWith(',')){
    searchText = searchText.slice(0,-1);
  }

  // process the search Text
  // w1 w2, w3 w4 => [[w1, w2], [w3,w4]] = (w1 and w2) or (w3 or w4)
  let orList = searchText.split(',');
  let finalList = [];
  for (let text of orList){
    finalList.push(text.trim().split(' '));
  }
  

  ///////////////////// 
  // filter process //

  for (let tab of allTabs) {
    let isMatch = false;
    let title = tab.title.toLowerCase();
    let url = tab.url.toLowerCase();

    for (orWords of finalList){
      isMatch = true;
      for (word of orWords){
        if(!title.includes(word) && !url.includes(word)){
          isMatch = false;
          break;
        }
      }
      if (isMatch){
        break;
      }
    }

    // tab is a match, and added to the result list
    if (isMatch){
      resultTabs.push(tab);
    }

  }
  
  /////////////////////////
  // display the results //

  let resultsBox = document.querySelector("#search-tabs");
  resultsBox.innerHTML = "";
  let resultsList = document.createElement("ol");

  let thisTab = (await browser.tabs.query({active:true, currentWindow:true}))[0];
  
  let k = 0; // counter for list item

  for (let tab of resultTabs){
    let tabItem = document.createElement('li');
    let itemCounter = document.createElement('span');
    let favIcon = document.createElement('span');
    let titleTab = document.createElement('span');
    let closeTab = document.createElement('span');
    
    k++; // counter for list item
    itemCounter.textContent = k + '.'; // fill itemCounter

    // fill favicon
    if(tab.favIconUrl){
      if(tab.favIconUrl.startsWith("http")){
        favIcon.style.backgroundImage = 'url(' + tab.favIconUrl +')';
      }
    }

    titleTab.textContent = tab.title// fill tab title
    
    //prepare class button and add event listener
    closeTab.classList.add('close');
    closeTab.id = tab.id; //keep track of the tab id 
    closeTab.addEventListener('click', (e) =>{
      // prevent propagating and  moving to another tab
      e.stopPropagation(); 
      //removing tab
      let tabId = Number(e.target.id);
      browser.tabs.remove(tabId);
      //removing the list item in the list
      e.target.parentNode.remove();
      //renumerating the list 
      renumerate(searchTabs);
    });
    
    // form list item
    tabItem.appendChild(itemCounter); 
    tabItem.appendChild(favIcon);
    tabItem.appendChild(titleTab);
    tabItem.appendChild(closeTab);


    resultsList.appendChild(tabItem); //append to the list

    // assign tab id and window ID as id and class of tabItem
    // in order to inherit such values
    tabItem.id = tab.id;
    tabItem.className =tab.windowId;
    
    //add special class to item related to active tab
    if (tab.id == thisTab.id ){
      tabItem.className = 'active';
    }

    //ading listener for click events
    tabItem.addEventListener('click', changeTab);

    // change tab function
    function changeTab(e) {
      let id;
      let windowId;
      if (e.target.nodeName.toLowerCase() === "li"){
        id = Number(e.target.id);
        windowId = Number(e.target.className);
      } else {
        windowId = Number(e.target.parentNode.className);
        id = Number(e.target.parentNode.id);
      }

      //handling same tab as active
      if (id == thisTab.id){
        window.close(); // already in the selected tab
        return;
      }
      
      browser.windows.update(windowId, {focused: true});
      browser.tabs.update(id, {active: true});
      window.close();
    }

    //adding attribute for arrow key focus
    tabItem.setAttribute("tabindex", "1");

    //adding listener for enter key down
    tabItem.addEventListener('keydown', (e) => {
      if (e.keyCode === 13){
        changeTab(e);
      }
    });
  }

  resultsBox.appendChild(resultsList);
  
  // Dynamic list counter width
  resultsBox.classList.remove('empty');
  resultsBox.classList.remove('one-digit');
  resultsBox.classList.remove('two-digits');
  resultsBox.classList.remove('three-digits');
  if (k === 0){
    resultsBox.classList.add('empty');
  } else if (k < 10){
    resultsBox.classList.add('one-digit');
  } else if(k < 100){
    resultsBox.classList.add('two-digits');
  } else {
    resultsBox.classList.add('three-digits');
  }


  // if list is empty, activate search helper window
  if(resultsBox.classList.contains('empty') && presets.modeActive === "search"){
    searchHelper.classList.add('active');
  } else{
    searchHelper.classList.remove('active');
  }
}


/*
function that will help renumerate tab lists without reloading 
popup, ideal to avoid flickering screen
*/

function renumerate(listContainer){
  let list = listContainer.firstChild;
  //check if container child is a list
  if (list.nodeName.toLowerCase() === 'ol'){
    let k = 1;
    for (let item of list.childNodes){
      item.firstChild.textContent = k + '.';
      k++;
    }
  }
}
