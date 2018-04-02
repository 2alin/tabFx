
// I have plans to expand the extension with presets
/*
  Setting preset constructor, instances and  presets list
*/
function Preset(name){
  this.name = name;
  this.start = {
    isOn: true,
    value: ""
  }
  this.end = {
    isOn: true,
    value: ""
  }
}
var presets = [ new Preset("auto"), new Preset("preset1")];



/*
  update presets.auto as well as popup elements depending on it
*/
async function updateAuto(){
  let thisTab = (await browser.tabs.query({active:true, currentWindow:true}))[0];

  // retrieving auto start query
  if (thisTab.url.startsWith('http')) {
    // catching http and https urls
    let re = new RegExp('https*://([^/])+/', 'i');
    presets[0].start.value = re.exec(thisTab.url)[0];
  } else {
    // catching about, file, etc urls
    let re = new RegExp('^([a-z]+:)', 'i');
    presets[0].start.value = re.exec(thisTab.url)[0];
  }
  
  // retrieving auto end query
  // breakpoints chars are: '/' and '$'
  let re = new RegExp('([.$][a-z]+)$' , 'i');
  if (re.test(thisTab.url)){
    presets[0].end.value = re.exec(thisTab.url)[0];
  }

  document.querySelector('#start-select + span').textContent = presets[0].start.value;
  document.querySelector('#end-select + span').textContent = presets[0].end.value;
}



/*
  fill 'matching tabs' list
*/
async function fillAutoResults(){
  let tabs = await browser.tabs.query({});

  // creating a list of tabs that matches the auto queries
  let foundTabs = [];
  let start = presets[0].start;
  let end = presets[0].end;
  
  for (let tab of tabs){
    //considering all 4 states of auto checkboxes
    if (start.isOn && end.isOn){
      if (tab.url.startsWith(start.value) && tab.url.endsWith(end.value)){
        foundTabs.push(tab);
      }
    } else if (start.isOn && !end.isOn){
      if (tab.url.startsWith(start.value)){
        foundTabs.push(tab);
      }
    } else if (!start.isOn && end.isOn){
      if (tab.url.endsWith(end.value)){
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
  updateAuto();
  fillAutoResults();
} );


/*
  handle form values
*/
startSelect= document.querySelector('#start-select');
endSelect= document.querySelector('#end-select');
// loading checked values from preset object
startSelect.checked = presets[0].start.isOn;
endSelect.checked = presets[0].end.isOn;
// adding event listeners and update object values
startSelect.addEventListener('click', () => {
  presets[0].start.isOn = startSelect.checked;
  fillAutoResults();
  
});  
endSelect.addEventListener('click', () => {
  presets[0].end.isOn = endSelect.checked;
  fillAutoResults();
});  

updateAuto();
fillAutoResults();