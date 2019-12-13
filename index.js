var story = [ {"currentState": 1, "currentMessage": 0},
	{"state": 1, "order": true, "messages": ["...","........","Where am I?","Why am I wet?","..."]},
	{"state": 2, "order": true, "messages": ["No one in sight.","I should explore my surroundings","Better prepare for it"]}
	];
var resources = {};
var actions = {};
var onGoingAction = {action: "", state: 0};
var onGoingInvent = {invent: "", state: 0};
var onGoingBuild = {build: "", state: 0}; 
var phaseGame = {"phase": 0, "displayed": true};
// contain the upgraded speed
var upgrades = {"speed": 1};
// necessary for the events and other stuff
var currentTab = "";
// signal a new invention or build to the player
var newInvention = false;
var newBuild = false; 
// zone where the player is
var actualZone = "beach-1";
// main loop every (refresh)ms
var refresh = 50;
// to correct the time 
var lastTime = Date.now();
var timeDelta = 0;
var refreshCorrected;
// "checked" if the button repeat action is checked
var actionRepeat = "";


window.onload = () => {
	// initialisation
	if (localStorage.getItem('version') != null) {
		load();
	} else {
		initialState();
	}
	createResourcesContent();
	// main loop
	main();
	// intervals to check
	setInterval(storyMessages, 500);
	setInterval(verifyGamePhase, 500);
	setInterval(refreshInventRequirement, 1000);
	setInterval(refreshUniqueBuildingRequirement, 1000);
	setInterval(checkEvents, 1000);
}

/* refresh every refresh/1000 s */
function main() {
	advanceAllActions();
	actualiseResources();
	refreshCorrected = calculateDeltaTime();
	setTimeout(main, refreshCorrected);
}

/*	calculate how much the time as deviated
	and rectify the loop
	if the window is out of focus, time will be corrected over time, running faster as long as timeDelta stays negative (~ 15-16ms in lieue of 50ms refresh) 
*/
function calculateDeltaTime() {
	let now = Date.now();
	let delta = (now - lastTime) - timeDelta;
	timeDelta = refresh - delta;
	let correctedTime = refresh + timeDelta;
	lastTime = now;
	return correctedTime;
}

function save() {
	localStorage.setItem('resources', JSON.stringify(resources));
	localStorage.setItem('actions', JSON.stringify(actions));
	localStorage.setItem('actualZone', actualZone);
	localStorage.setItem('story', JSON.stringify(story));
	localStorage.setItem('phaseGame', JSON.stringify(phaseGame));
	localStorage.setItem('upgrades', JSON.stringify(upgrades));
	localStorage.setItem('lastTime', lastTime);
	localStorage.setItem('onGoingAction', JSON.stringify(onGoingAction));
	localStorage.setItem('onGoingBuild', JSON.stringify(onGoingBuild));
	localStorage.setItem('onGoingInvent', JSON.stringify(onGoingInvent));
	localStorage.setItem('version', 1);
}

function load() {
	resources = JSON.parse(localStorage.getItem('resources'));
	actions = JSON.parse(localStorage.getItem('actions'));
	actualZone = localStorage.getItem('actualZone');
	story = JSON.parse(localStorage.getItem('story'));
	phaseGame = JSON.parse(localStorage.getItem('phaseGame'));
	upgrades = JSON.parse(localStorage.getItem('upgrades'));
	/* for now we won't use it, change that later
	lastTime = localStorage.getItem('lastTime');
	*/
	onGoingAction = JSON.parse(localStorage.getItem('onGoingAction'));
	onGoingBuild = JSON.parse(localStorage.getItem('onGoingBuild'));
	onGoingInvent = JSON.parse(localStorage.getItem('onGoingInvent'));
	//	go through every game phase very fast
	let savePhase = phaseGame.phase;
	let i;
	for(i=0; i < savePhase+1; i++) {
		phaseGame.phase = i;
		phaseGame.displayed = false;
		displayGamePhase();
	}
	// generate each tab
	createTabContent('main');
	createTabContent('build');
	createTabContent('invent');
	changeTab('main');
}

function reload() {
	// loading isn't done manually
	window.location.reload();
}

function clearSave() {
	localStorage.clear();
	reload();
}

/* first time playing, initialise the data */
function initialState () {
	resources = {
		"wood": {"amount": 0, "max": 10, "visible": false},
		"metal": {"amount": 0, "max": 10, "visible": false},
		"plastic": {"amount": 0, "max": 10, "visible": false},
		"leaf": {"amount": 0, "max": 10, "visible": false}
	};
	actions = {
		"player": {
			"main": {
				"beach-1": {
					"drifting_wood": {"speed": 1, "visible": false, "label": "Pick up wood", "tooltip": "It's there, washed up on the shore, and it's free", "resource": [
						{"name": "wood", "amount": 1, "chance": 1}]},
					"metal_bits": {"speed": 1, "visible": false, "label": "Dig up metal bits", "tooltip": "Be careful with the pointy end", "resource": [
						{"name": "metal", "amount": 1, "chance": 1}]},
					"plastic_bags": {"speed": 1, "visible": false, "label": "Search for plastic bags", "tooltip": "Pollution for some is treasure for others", "resource": [
						{"name": "plastic", "amount": 1, "chance": 1}]},
					"banana_leaves": {"speed": 1, "visible": false, "label": "Unhook banana leaves", "tooltip": "Make them leaf the tree for you", "resource": [
						{"name": "leaf", "amount": 1, "chance": 1}]}
				}
			},
			"build": {
				"wood_cart": {"visible": false, "label": "Wood cart", "tooltip": "It will help storing the wood. Not very effective, but does the job done.", "effect": {"type": "storageLimit", "addLimit": [{"wood": 5}]}, "cost": [{"wood": 10}], "costAugment": 1, "speed": 0.5, "amount": 0},
				"metal_bucket": {"visible": false, "label": "Metal bucket", "tooltip": "Just throw in it all the metal bits you could lose in the sand.", "effect": {"type": "storageLimit", "addLimit": [{"metal": 5}]}, "cost": [{"metal": 10}], "costAugment": 1, "speed": 0.5, "amount": 0},
				"bag_of_bags": {"visible": false, "label": "Bag of bags", "tooltip": "It isn't bottomless", "effect": {"type": "storageLimit", "addLimit": [{"plastic": 5}]}, "cost": [{"plastic": 10}], "costAugment": 1, "speed": 0.5, "amount": 0},
				"leaves_net": {"visible": false, "label": "Leaves net", "tooltip": "It isn't made of leaves but it still store them together", "effect": {"type": "storageLimit", "addLimit": [{"leaf": 5}]}, "cost": [{"plastic": 5}], "costAugment": 1, "speed": 0.5, "amount": 0},
				"hammock": {"visible": false, "label": "Hammock", "tooltip": "A rest for the body, a race for the thoughts", "effect": {"type": "unique", "addThinkSpeed": 1}, "cost": [{"plastic": 30}], "costAugment": 1, "speed": 0.1, "amount": 0},
				"wood_hut": {"visible": false, "label": "Wood hut", "tooltip": "Spend less time worrying about the weather and more about new ideas", "effect": {"type": "unique", "addThinkSpeed": 2}, "cost": [{"wood": 50}, {"plastic": 20}, {"leaf": 30}], "costAugment": 1, "speed": 0.05, "amount": 0},
				"cartography_table": {"visible": false, "label": "Cartography table", "tooltip": "We can't draw, but with enough paper we can learn", "effect": {"type": "unique", "openMap": true}, "cost": [{"wood": 20}, {"plastic": 10}, {"leaf": 50}], "costAugment": 1, "speed": 0.01, "amount": 0}
			},
			"invent": {
				"repeat_main": {"label": "Repeat action", "tooltip": "Maybe we could just do stuff repeatedly?", "requirement": [{"wood": 3}], "visible": false, "speed": 5, "unlock": [{"option": "repeat_main"}], "invented": false},
				"wood_cart": {"label": "Wood cart", "tooltip": "What if we stored the wood?", "requirement": [{"wood": 7}], "visible": false, "speed": 1, "unlock": [{"build": "wood_cart"}], "invented": false},
				"plank_shovel": {"label": "Plank shovel", "tooltip": "Let's dig a little bit !", "requirement": [{"wood": 15}], "visible": false, "speed": 0.5, "unlock": [{"zone": "beach-1", "action": "metal_bits"}], "invented": false},
				"bag_of_bags": {"label": "Bag of bags", "tooltip": "Recursive storage !", "requirement": [{"plastic": 7}], "visible": false, "speed": 0.5, "unlock": [{"build": "bag_of_bags"}], "invented": false},
				"metal_bucket": {"label": "Metal bucket", "tooltip": "We can store metal in it", "requirement": [{"metal": 7}], "visible": false, "speed": 0.5, "unlock": [{"build": "metal_bucket"}], "invented": false},
				"leaves_net": {"label": "Leaves net", "tooltip": "The plastic has so many uses! We can plait it, and ... plait it", "requirement": [{"plastic": 20}], "visible": false, "speed": 0.2, "unlock": [{"build": "leaves_net"}], "invented": false},
				"metal_shovel": {"label": "Metal shovel", "tooltip": "What's hiding under all this sand ?", "requirement": [{"metal": 15}], "visible": false, "speed": 0.5, "unlock": [{"zone": "beach-1", "action": "plastic_bags"}], "invented": false},
				"small_hatchet": {"label": "Small hatchet", "tooltip": "We have wood and metal, if we combine them, we could have... wooal... metood...", "requirement": [{"metal": 20}], "visible": false, "speed": 0.5, "unlock": [{"zone": "beach-1", "action": "banana_leaves"}], "invented": false}
			}
		}
	};
}

/* contain all the tests to advance actions */
function advanceAllActions() {
	if (onGoingAction.action != "") {
		advanceAction();
	}
	if (onGoingInvent.invent != "") {
		advanceInvent();
	}
	if (onGoingBuild.build != "") {
		advanceBuild();
	}
}

/* 	check the state of onGoingAction and initialise it if needed */
function doAction (action, type) {
	switch(type) {
		case 'main':
			if (onGoingAction.action == "" || actionRepeat== "checked") {
				onGoingAction.state = 0;
				if (onGoingAction.action != "" && onGoingAction.action != action)
				{
					// to refresh the visuals 
					createTabContent('main');
				}
				onGoingAction.action = action;
			}
			break;
		case 'build':
			if (onGoingBuild.build == "") {
				let canBuy = true;
				actions.player.build[action].cost.forEach(function(resource) {
					if (resources[Object.keys(resource)[0]].amount < Math.floor(10* resource[Object.keys(resource)[0]] * Math.pow(actions.player.build[action].costAugment, actions.player.build[action].amount))/10) {
						canBuy = false;
					}
				});
				if (canBuy) {
					actions.player.build[action].cost.forEach(function(resource) {
						resources[Object.keys(resource)[0]].amount -= Math.floor(10* resource[Object.keys(resource)[0]] * Math.pow(actions.player.build[action].costAugment, actions.player.build[action].amount))/10;
					});
					onGoingBuild.build = action;
				}
			} 
			break;
		case 'invent':	
			if (onGoingInvent.invent == "") {
				onGoingInvent.invent = action;
			}
			break;
	}
}

/* transition from one tab to another */
function changeTab(tab) {
	let tabNames = ['main', 'build', 'invent', 'map']
	tabNames.forEach(function(tabName) {
		//change style tab
		if ((document.getElementById(tabName).className != "hidden notcurrent_tab tab") && (tabName != tab)) {
			document.getElementById(tabName).className = "nothidden notcurrent_tab tab";			
		}
		//change content
		if (tabName != tab) {
			document.getElementById("content_alone_" + tabName).className = "hidden content";
		}
	});
	document.getElementById("content_alone_" + tab).className = "nothidden content";
	document.getElementById(tab).className = "nothidden current_tab tab";
	createTabContent(tab);
}

/* 	advance the visuals of the action, if it finishes, change the amount of resources by the amount of the action */
function advanceAction () {
	if (onGoingAction.state != 100) {
		onGoingAction.state += actions.player.main[actualZone][onGoingAction.action].speed;
	}
	//170 is the length of the button, change here or automatise later
	document.getElementById("action_"+onGoingAction.action).style.width = Math.floor(170*onGoingAction.state/100).toString() + "px";
	if (onGoingAction.state >= 100) {
		//if just one resource can be produced and it's full, block the bar **later change that to test each resource produced**
		let nbrRes =actions.player.main[actualZone][onGoingAction.action].resource;
		if (nbrRes.length == 1 && resources[nbrRes[0].name].amount == resources[nbrRes[0].name].max) {
			onGoingAction.state = 100;
		} else {
			onGoingAction.state = 0 ;
			//chances of resources from action, check in order
			let rand = Math.random();
			actions.player.main[actualZone][onGoingAction.action].resource.forEach(function(resource) {
				if (rand < resource.chance) {
					//dont want another resource getting picked
					rand = 2;
					resources[resource.name].amount += resource.amount;
					//cant exceed the max amount
					if (resources[resource.name].amount > resources[resource.name].max) {
						resources[resource.name].amount = resources[resource.name].max;
					} else {
						//if speed isn't maxed (10 for the moment), augment it
						//add 1.1 instead of 1 else, it will break sometimes, because programming is fun
						if (actions.player.main[actualZone][onGoingAction.action].speed < 10) {
							actions.player.main[actualZone][onGoingAction.action].speed = Math.floor(1.1 + 100*actions.player.main[actualZone][onGoingAction.action].speed)/100;

						}
					}
					//when action end, check if the resource gained was hidden, if then unhide it
					if (!resources[resource.name].visible) {
						resources[resource.name].visible = true;
						//refresh the resources
						createResourcesContent();
					}
				}
			});		
			document.getElementById("action_"+onGoingAction.action).style.width = Math.floor(170*onGoingAction.state/100).toString() + "px";
			if (actions.player.invent['repeat_main'].invented && document.getElementById('action_repeat') !== null) {
				if (!document.getElementById('action_repeat').checked) {
					onGoingAction.action = "";
					actionRepeat = "";
				} else {
					actionRepeat = "checked";
				}
			} else {
				onGoingAction.action = "";
			}
			//to refresh the timers
			if (currentTab == "main") {
				createTabContent('main');
			}
		}
	}
}

/* advance the visuals of the build, if it finishes change the correct thing adressed by the build */
function advanceBuild() {
	onGoingBuild.state += actions.player.build[onGoingBuild.build].speed;
	//170 is the length of the button, change here or automatise later
	document.getElementById("build_"+onGoingBuild.build).style.width = Math.floor(170*onGoingBuild.state/100).toString() + "px";
	if (onGoingBuild.state >= 100) {
		onGoingBuild.state = 0 ;
		actions.player.build[onGoingBuild.build].amount ++;
		switch (actions.player.build[onGoingBuild.build].effect.type) {
			case "storageLimit":
				// augment the cap of resource pointed to
				actions.player.build[onGoingBuild.build].effect.addLimit.forEach(function(resource) {
					resources[Object.keys(resource)[0]].max += resource[Object.keys(resource)[0]];
				});
				// augment the speed of construction, max 5
				if (actions.player.build[onGoingBuild.build].speed < 5) {
					actions.player.build[onGoingBuild.build].speed = Math.floor(1 + 10 * actions.player.build[onGoingBuild.build].speed)/10;
				}
				break;
			case "unique":
				if (Object.keys(actions.player.build[onGoingBuild.build].effect)[1] == "addThinkSpeed") {
					upgrades.speed += actions.player.build[onGoingBuild.build].effect.addThinkSpeed;
				}
				break;
		}
		document.getElementById("build_"+onGoingBuild.build).style.width = Math.floor(170*onGoingBuild.state/100).toString() + "px";
		onGoingBuild.build = "";
		// to refresh the costs
		if (currentTab == "build") {
			createTabContent('build');
		}
	}
}

/*	Advance the visuals of inventing, same as advanceAction but we want the two to happen at the same time. */
function advanceInvent() {
	onGoingInvent.state += actions.player.invent[onGoingInvent.invent].speed * upgrades.speed;
	//170 is the length of the button, change here or automatise later
	document.getElementById("invent_"+onGoingInvent.invent).style.width = Math.floor(170*onGoingInvent.state/100).toString() + "px";
	if (onGoingInvent.state >= 100) {
		onGoingInvent.state = 0 ;
		//declare the invention done
		actions.player.invent[onGoingInvent.invent].invented = true;
		actions.player.invent[onGoingInvent.invent].visible = false;
		//verify each thing unlocked by the invention
		actions.player.invent[onGoingInvent.invent].unlock.forEach(function(unlock) {
			switch (Object.keys(unlock)[0]) {
				case 'build':
					actions.player[Object.keys(unlock)[0]][unlock[Object.keys(unlock)[0]]].visible = true;
					newBuild = true;
					//if in build tab, refresh it
					if (currentTab == "build") {
						createTabContent('build');
					}
					break;
				case 'zone':
					actions.player.main[unlock[Object.keys(unlock)[0]]][unlock.action].visible = true;
					if (currentTab == "main") {
						createTabContent('main');
					}
					break;
				case 'option':
					if (currentTab == 'main') {
						createTabContent('main');
					}
					break;
			}
		});
		document.getElementById("invent_"+onGoingInvent.invent).style.width = Math.floor(170*onGoingInvent.state/100).toString() + "px";
		onGoingInvent.invent = "";
		//refresh the tab content, make the invention disapear *poof*
		if (currentTab == "invent") {
			createTabContent('invent');
		}
	}
} 

/*	actualise the resources amount and max amount on the DOM */
function actualiseResources () {
	let resource = "";
	Object.keys(resources).forEach(function(resourceName) {
		document.getElementById(resourceName).innerHTML = Math.floor(10*resources[resourceName].amount)/10;
		document.getElementById("max"+resourceName).innerHTML = resources[resourceName].max;
	});
}

/*	advance the story, depends on the current stage of the game */
function storyMessages() {
	let state=story[0].currentState;
	let message=story[0].currentMessage;
	//if order is true, play the message in the order of the array, else play a random one
	if (message < story[state].messages.length) {
		if (story[state].order) {
			document.getElementById('text').innerHTML = "<p>" + story[state].messages[message] + "</p>" + document.getElementById('text').innerHTML;
			story[0].currentMessage ++;
		} else {
			//aleatoire à faire
		}
	}
}

/*	verify if we should change phaseGame 
	structure: 
	-> phaseGame: cond to change phaseGame to phaseGame++
	-> phaseGame+1: unlocked by the change
*/
function verifyGamePhase () {
	var i = phaseGame.phase;
	switch (i) {
		case 0:
			if ((story[0].currentState == 1) && (story[0].currentMessage == story[1].messages.length)) {
				phaseGame.phase++;
				phaseGame.displayed = false;
			}
			break;
		case 1:
			if (resources.wood.amount > 2) {
				phaseGame.phase++;
				phaseGame.displayed = false;
			}
			break;
		case 2:
			if (actions.player.invent.wood_cart.invented) {
				phaseGame.phase++;
				phaseGame.displayed = false;
			}
			break;
		case 3:
			if (actions.player.build.cartography_table.amount == 1) {
				phaseGame.phase++;
				phaseGame.displayed = false;
				story[0].currentState = 2;
				story[0].currentMessage = 0;
			}
			break;
	}
	if(!phaseGame.displayed) {
		displayGamePhase();
	}
}

/* function separated from verifyGamePhase to help fast loading through them when reloading */
function displayGamePhase() {
	switch(phaseGame.phase) {
		case 1:
			document.getElementById("player").className= "not" + document.getElementById("player").className;
			document.getElementById("content_alone_main").className = "not" + document.getElementById("content_alone_main").className;
			document.getElementById("resources").className = "not" + document.getElementById("resources").className;
			actions.player.main["beach-1"].drifting_wood.visible = true;
			createTabContent("main");
			break;
		case 2:
			document.getElementById("main").className = "not" + document.getElementById("main").className;
			document.getElementById("invent").className = "not" + document.getElementById("invent").className;
			break;
		case 3:
			document.getElementById("build").className = "not" + document.getElementById("build").className;
			break;
		case 4:
			document.getElementById("map").className = "not" + document.getElementById("map").className;
			break;
	}
	phaseGame.displayed = true;
}

/*	create the tab content, by adding a title, buttons 
	one button example: 
	<div class="hidden action_button" onClick="doAction('rubble')" id="button_rubble">
		<p>Search into rubble</p>
		<div id="action_rubble"></div>
	</div>
	** is a bit much loaded, let's try later to separate it in little cute functions **
*/
function createTabContent(tab) {
	let tabContent = "";
	let tabRight = "";
	let tooltip = "";
	let i = 0;
	currentTab = tab;
	switch (tab) {
		case "main":
			if (actions.player.invent['repeat_main'].invented) {
				tabContent += "<p class=\"repeat\"><input type=\"checkbox\" id=\"action_repeat\"" + actionRepeat + ">Repeat action</p>";
			}
			tabContent += "<p>" + actualZone + "</p><div class=\"content_left\">";
			tabRight = "</div><div class=\"content_right\">";
			Object.keys(actions.player.main[actualZone]).forEach(function(buttons) {
				if (actions.player.main[actualZone][buttons].visible) {
					tooltip = "<p style=\"font-style: italic;\">" + actions.player.main[actualZone][buttons].tooltip + "</p>";
					i = 0;
					actions.player.main[actualZone][buttons].resource.forEach(function(resource) {
						tooltip += "<p style=\"text-align: left;\">"
						if (i == 0) {
							i++;
							tooltip += "Get ";
						} else {
							tooltip += "Or ";
						}
						tooltip += resource.amount + " " + resource.name + "</p>";
					});
					tooltip += "<p style=\"text-align: right;\">Speed: " + actions.player.main[actualZone][buttons].speed + " (" + formatTime(actions.player.main[actualZone][buttons].speed) + ")</p>"
					tabContent += "<div class=\"action_button\" onClick=\"doAction('"+ buttons + "','main')\" id=\"button_" + buttons + "\"><span class=\"tooltiptext\">" +tooltip + "</span><p>" + actions.player.main[actualZone][buttons].label + "</p><div id=\"action_" + buttons + "\"></div></div>";
				}

			});
			tabContent += tabRight + "</div>";
			break;
		case "invent":
			// hide the ! signal
			if (newInvention) {
				newInvention = false;
				document.getElementById('newInvention').className = "hidden signalNew";
			}
			tabContent += "<p>Think Harder</p>";
			tabContent += "<div class=\"content_left\">";
			tabRight += "</div><div class=\"content_right\"><div class=\"rightSimpleText\">Invented:</div>";
			Object.keys(actions.player.invent).forEach(function(buttons) {
				if (actions.player.invent[buttons].visible) {
					tooltip = "<p style=\"font-style: italic;\">" + actions.player.invent[buttons].tooltip + "</p>";
					tooltip += "<p style= \"text-align: right;\">Speed: ";
					if (upgrades.speed != 1) {
						tooltip += upgrades.speed + "x";
					}
					tooltip += actions.player.invent[buttons].speed + " (" + formatTime(actions.player.invent[buttons].speed * upgrades.speed) + ")</p>";			
					tabContent += "<div class=\"action_button\" onClick=\"doAction('"+ buttons + "','invent')\" id=\"button_" + buttons + "\"><span class=\"tooltiptext\">" + tooltip + "</span><p>" + actions.player.invent[buttons].label + "</p><div id=\"invent_" + buttons + "\"></div></div>";
				}
				if (actions.player.invent[buttons].invented) {
					tooltip = "<p style=\"font-style: italic;\">" + actions.player.invent[buttons].tooltip + "</p>";
					tabRight += "<div class=\"rightSimpleText\"><span class=\"tooltiptext\">" + tooltip + "</span>" + actions.player.invent[buttons].label + "</div>";
				}
			});
			tabContent += tabRight + "</div>";
			break;
		case "build":
			/* **multiple lines are redondant, make it prettier later** */
			if (newBuild) {
				newBuild = false; 
				document.getElementById('newBuild').className = "hidden signalNew";
			}
			tabContent += "<p>Let's make something with our hands</p><div class=\"content_left\">";
			tabRight = "</div><div class=\"content_right\">";
			let tabRightBuilt = "";
			Object.keys(actions.player.build).forEach(function(buttons) {
				if (actions.player.build[buttons].visible && actions.player.build[buttons].effect.type != "unique") {
					tooltip = "<p style=\"font-style: italic;\">" + actions.player.build[buttons].tooltip + "</p>";
					actions.player.build[buttons].cost.forEach(function(resource) {
						tooltip += "<p style=\"text-align: left;\">Cost ";
						i = Math.floor(10* resource[Object.keys(resource)[0]] * Math.pow(actions.player.build[buttons].costAugment, actions.player.build[buttons].amount))/10;
						tooltip += i.toString() + " " + Object.keys(resource)[0];
						tooltip += "</p>";
					});
					tooltip += "<p style =\"text-align: right;\">Speed: " + actions.player.build[buttons].speed + " (" + formatTime(actions.player.build[buttons].speed) + ")</p>";
					tabContent += "<div class=\"action_button\" onClick=\"doAction('"+ buttons + "','build')\" id=\"button_" + buttons + "\"><span class=\"tooltiptext\">" + tooltip + "</span><p>" + actions.player.build[buttons].label;
					if (actions.player.build[buttons].amount != 0) {
						tabContent += " (" + actions.player.build[buttons].amount + ")";
					} 
					tabContent += "</p><div id=\"build_" + buttons + "\"></div></div>";
				} else {
					if (actions.player.build[buttons].visible) {
						tooltip = "<p style=\"font-style: italic;\">" + actions.player.build[buttons].tooltip + "</p>";
						if (actions.player.build[buttons].amount == 0) {
							actions.player.build[buttons].cost.forEach(function(resource) {
							tooltip += "<p style=\"text-align: left;\">Cost ";
							i = Math.floor(10* resource[Object.keys(resource)[0]] * Math.pow(actions.player.build[buttons].costAugment, actions.player.build[buttons].amount))/10;
							tooltip += i.toString() + " " + Object.keys(resource)[0];
							tooltip += "</p>";
							});
							tooltip += "<p style =\"text-align: right;\">Speed: " + actions.player.build[buttons].speed + " (" + formatTime(actions.player.build[buttons].speed) + ")</p>";
							tabRight += "<div class=\"action_button\" onClick=\"doAction('"+ buttons + "','build')\" id=\"button_" + buttons + "\"><span class=\"tooltiptext\">" + tooltip + "</span><p>" + actions.player.build[buttons].label;
							tabRight += "</p><div id=\"build_" + buttons + "\"></div></div>";
						} else {
							tabRightBuilt += "<div class=\"rightSimpleText\"><span class=\"tooltiptext\">" + tooltip + "</span>" + actions.player.build[buttons].label + "</div>";
						}
					}
				}
			});
			if (tabRightBuilt !== "") {
				//	no content, no display
				tabRightBuilt = "<div class=\"rightSimpleText\">Built:</div>" + tabRightBuilt;
			}
			tabContent += tabRight + tabRightBuilt + "</div>";
			break;
		case "map":
			tabContent = "<p>You've reached the end game for now</p><p>Or just the beginning</p>";
			break;
	}
	document.getElementById('content_alone_' + tab).innerHTML = tabContent;
}

/*	create the resources content, by adding each resources 
	example: 
	<p class="hidden" id="pwood">Wood: <span id="wood"></span> / <span id="maxwood"></span></p>
*/
function createResourcesContent() {
	let resourcesContent = "";
	Object.keys(resources).forEach(function(resource) {
		resourcesContent += "<p class=\"";
		if (resources[resource].visible) {
			resourcesContent += "not";
		}
		resourcesContent += "hidden\" id=\"p" + resource + "\">" + resource + ": <span id=\"" + resource + "\"></span> / <span id=\"max" + resource + "\"></span></p>"
	});
	document.getElementById("resources").innerHTML = resourcesContent;
}

/* verify if the requirement for an invention is met 
	if so make it visible
	if the invention is done, hide it again
	***later change that as an option*** 
*/
function refreshInventRequirement() {
	let makeVisible = true;
	let resource = "";
	Object.keys(actions.player.invent).forEach(function(inventName) {
		if (!actions.player.invent[inventName].visible && !actions.player.invent[inventName].invented) {
			makeVisible = true;
			actions.player.invent[inventName].requirement.forEach(function(require) {
				resource = Object.keys(require)[0];
				if(resources[resource].amount < require[resource]) {
					makeVisible = false;
				}
			});
			if (makeVisible) {
				newInvention = true;
				actions.player.invent[inventName].visible = true;
				if (currentTab == "invent") {
					createTabContent('invent');
				}
			}
		} 
	});
}

/*	verify if resources meet 75% of the resources requirement for unique building and display them if so */
function refreshUniqueBuildingRequirement() {
	let makeVisible = true; 
	let res = "";
	Object.keys(actions.player.build).forEach(function(buildName) {
		makeVisible = true;
		if (actions.player.build[buildName].effect.type == "unique" && !actions.player.build[buildName].visible) {
			actions.player.build[buildName].cost.forEach(function(resName) {
				res = Object.keys(resName)[0];
				if (resources[res].max < 0.75 * resName[res]) {
					makeVisible = false;
				}
			});
			if (makeVisible) {
				newBuild = true;
				actions.player.build[buildName].visible = true;
				if (currentTab == "build") {
					createTabContent('build');
				}
			}
		}
	});
}

/* takes speed as argument, return time formated in string */
function formatTime(speed) {
	let timeInSeconds;
	let hours=0;
	let minutes=0;
	let seconds=0;
	let formatedTime = "";
	timeInSeconds = Math.floor(100/((1000/refresh) * speed));
	if (timeInSeconds/3600 >= 1) {
		hours = Math.floor(timeInSeconds/3600);
		timeInSeconds -= 3600 * hours;
		formatedTime += hours.toString() + "h, ";
	}
	if (timeInSeconds/60 >= 1) {
		minutes = Math.floor(timeInSeconds/60);
		timeInSeconds -= 60 * minutes;
		formatedTime += minutes.toString() + "m, ";
	}
	seconds = Math.floor(timeInSeconds);
	formatedTime += seconds.toString() + "s"
	return formatedTime;
}

/* check all events that must be notified */
function checkEvents() {
	if (newInvention && currentTab != "invent") {
		document.getElementById('newInvention').className = "nothidden signalNew";
	}
	if (newBuild && currentTab != "build") {
		document.getElementById('newBuild').className = "nothidden signalNew";
	}
}