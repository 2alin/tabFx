

/*
  Setting presets Default
*/

var presetsDefault = {
  modeActive: "auto",
  auto: {
    startIsOn: true,
    startValue: "",
    endIsOn: true,
    endValue: ""
  }
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
    if(result.hasOwnProperty("presetsLocal")){
      // there's presets saved locally already
      console.log("I exist already");
      presets = result.presetsLocal;
    } else{
      // no presets saved yet
      console.log("sorry I don't exist");
      presets = presetsDefault;
    }
    console.log(presets);
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
  
  // retrieving auto end query
  // breakpoints chars are: '/' and '$'
  let re = new RegExp('([.$][a-z]+)$' , 'i');
  if (re.test(thisTab.url)){
    presets.auto.endValue = re.exec(thisTab.url)[0];
  } else {
    //it has no end-breakpoints
    presets.auto.endValue = "";
  }

  updatePopup();
}

/*
  update tags and checkboxes in popup using presets
 */
function updatePopup() {
  console.log("popup updated");
  //filling tags in popup
  document.querySelector('#start-select + span').textContent = presets.auto.startValue;
  console.log(presets.auto.startValue);
  document.querySelector('#end-select + span').textContent = presets.auto.endValue;

  //filling checkboxes
  startSelect.checked = presets.auto.startIsOn;
  endSelect.checked = presets.auto.endIsOn;
}



/*
  fill 'matching tabs' result list
*/
async function fillAutoResults(){
  let tabs = await browser.tabs.query({});

  // creating a list of tabs that matches the auto queries
  let foundTabs = [];
  let startIsOn = presets.auto.startIsOn;
  let startValue = presets.auto.startValue;
  let endIsOn = presets.auto.endIsOn;
  let endValue = presets.auto.endValue;
  
  for (let tab of tabs){
    //considering all 4 states of auto checkboxes
    if (startIsOn && endIsOn){
      if (tab.url.startsWith(startValue) && tab.url.endsWith(endValue)){
        foundTabs.push(tab);
      }
    } else if (startIsOn && !endIsOn){
      if (tab.url.startsWith(startValue)){
        foundTabs.push(tab);
      }
    } else if (!startIsOn && endIsOn){
      if (tab.url.endsWith(endValue)){
        foundTabs.push(tab);
      }
    } else {
      foundTabs.push(tab);
    }
  }


  // displays a list of tab titles with ids matching
  // the tab id, as well as adding listener to them that
  // will change to its respectie tab when click over them
  //
  // For a reason, I got the items in 'ol' un-numbered, so 
  // I'm using 'k' as a counter
  let resultsBox = document.querySelector("#found-tabs");
  resultsBox.innerHTML = "";
  let thisTab = (await browser.tabs.query({active:true, currentWindow:true}))[0];
  let k = 0; // counter for list item
  for (let tab of foundTabs){
    let tabItem = document.createElement('li');
    
    k++; // counter for list item
    tabItem.textContent = k +'. '+ tab.title; // list item with counter
    resultsBox.appendChild(tabItem);

    // assign tab id and window ID as id and class of tabItem
    // in order to inherit such values
    tabItem.id = tab.id;
    tabItem.className =tab.windowId;
    
    //add special class to item related to active tab
    if (tab.id == thisTab.id ){
      tabItem.className = 'active';
    }

    tabItem.addEventListener('click', (e) => {
      let id = Number(e.target.id);
      let windowId = Number(e.target.className);
      browser.windows.update(windowId, {focused: true});
      browser.tabs.update(id, {active: true});
      window.close();
    });
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



