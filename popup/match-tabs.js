

/*
  Setting presets Default
*/

var presetsDefault = {
  modeActive: "auto",
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
  }
}

function validate(presetsTest){
  //verify existence of auto preset
  if (!presetsTest.hasOwnProperty("auto")){
    return false;
  }
  //verify length of auto preset object
  if (Object.keys(presetsTest.auto).length != Object.keys(presetsDefault.auto).length){
    return false;
  }
  return true
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
      
      presets = result.presetsLocal;
    } else{
      // no presets saved yet
      
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

document.addEventListener("DOMContentLoaded", restorePresets);




/*
  binding checkboxes to preset properties
*/

startSelect= document.querySelector('#start-select');
endSelect= document.querySelector('#end-select');
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
  update tags and checkboxes in popup using presets
 */
function updatePopup() {
  //filling tags in popup
  document.querySelector('#start').textContent = presets.auto.startValue;

  let includeText = "";
  for (word of presets.auto.includedWords){
    let finalWord = word;
    if (word.length > 8 ){
      finalWord = word.slice(0,6) + '...';
    }
    includeText += finalWord + ' '; 
  }

  document.querySelector('#include').textContent = includeText;

  let excludeText = "";
  for (word of presets.auto.excludedWords){
    let finalWord = word;
    if (word.length > 10 ){
      finalWord = word.slice(0,8) + '...';
    }
    excludeText += finalWord + ' '; 
  }

  document.querySelector('#ignore').textContent = excludeText;

  //filling checkboxes
  startSelect.checked = presets.auto.startIsOn;
  endSelect.checked = presets.auto.endIsOn;
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
  // will change to its respectie tab when click over them
  //
  // For a reason, I got the items in 'ol' un-numbered, so 
  // I'm using 'k' as a counter
  let resultsBox = document.querySelector("#found-tabs");
  resultsBox.innerHTML = "";
  let resultsList = document.createElement("ol");

  let thisTab = (await browser.tabs.query({active:true, currentWindow:true}))[0];
  console.log(thisTab);
  let k = 0; // counter for list item

  for (let tab of foundTabs){
    let tabItem = document.createElement('li');
    let itemCounter = document.createElement('span');
    let favIcon = document.createElement('span');
    let titleTab = document.createElement('span');
    
    k++; // counter for list item
    itemCounter.textContent = k + '.'; // fill itemCounter

    // fill favicon
    if(tab.favIconUrl){
      if(tab.favIconUrl.startsWith("http")){
        favIcon.style.backgroundImage = 'url(' + tab.favIconUrl +')';
      }
    }

    titleTab.textContent = tab.title// fill tab title
    
    // form list item
    tabItem.appendChild(itemCounter); 
    tabItem.appendChild(favIcon);
    tabItem.appendChild(titleTab);


    resultsList.appendChild(tabItem); //append to the list

    // assign tab id and window ID as id and class of tabItem
    // in order to inherit such values
    tabItem.id = tab.id;
    tabItem.className =tab.windowId;
    
    //add special class to item related to active tab
    if (tab.id == thisTab.id ){
      tabItem.className = 'active';
    }

    tabItem.addEventListener('click', (e) => {
      let id;
      let windowId;
      if (e.target.nodeName.toLowerCase() === "li"){
        id = Number(e.target.id);
        windowId = Number(e.target.className);
      } else {
        windowId = Number(e.target.parentNode.className);
        id = Number(e.target.parentNode.id);
      }
      browser.windows.update(windowId, {focused: true});
      browser.tabs.update(id, {active: true});
      window.close();
    });
  }

  resultsBox.appendChild(resultsList);
  
  // Dynamic list counter width
  resultsBox.className = "";
  if (k === 0){
    resultsBox.className = "empty";
  } else if (k < 10){
    resultsBox.className = "one-digit";
  } else if(k < 100){
    resultsBox.className = "two-digits";
  } else {
    resultsBox.className = "three-digits";
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




