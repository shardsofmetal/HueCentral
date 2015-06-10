/**
 * HueCentral
 *
 * main.js
 * 
 * Provides all javascript functionality for HueCentral, except for external 
 * libraries such as JQuery and JQuery Mobile. This file provides all 
 * functionality of the web app except for the HTML5 markup.
 *
 * @author    Zach Dennison
 * @copyright 2014 Zach Dennison
 * @license   https://www.gnu.org/licenses/gpl-2.0.txt GPL-2.0+
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/* Determine if app has been setup */
if (typeof(localStorage.appSetup) === "undefined" || localStorage.appSetup != "true") {
	localStorage.appSetup = "false";
}

if (localStorage.appSetup == "true" && typeof localStorage.api === "undefined") {
	localStorage.api = localStorage.address + "/api/" + localStorage.apiName + "/";
}

/* Update the list of 'type' (lights, groups, etc.) */
function updateList(type) {
	// Clear the page content
	$("#" + type + "-content").html("");
	
	var html; // The new HTML to be added
	
	// Get the full list of 'type' from the bridge
	$.getJSON(localStorage.api + type).done(function(list) {
		if (typeof list[0] === 'undefined') { // There was no error...
			html = '<ul data-role="listview" data-inset="true">';
			for (var key in list) {
				html += '<li><a href="#control" class="control-link" ' +
				  'data-type="' + type + '" data-id="' + key + '">' +
				  list[key].name + '</a><a href="#edit" class="edit-link" ' +
				  'data-type="' + type + '" data-id="' + key + '">Edit</a></li>';
			}
			html += '</ul>';
			
			// Add the HTML to the page
			$("#" + type + "-content").append(html).enhanceWithin();
			
			// Set localStorage data when clicking a link
			$(".control-link, .edit-link").click(function() {
				localStorage.controlType = $(this).jqmData("type");
				localStorage.controlID = $(this).jqmData("id");
			});
		}
	});	
}

function updateSat() {
	var hue = $('#hue-slider').val();
	var gradient = 'linear-gradient(left, #ffffff, hsl('+hue+', 100%, 50%))';
	var track = $('.ui-bar-y');
	track.css('background', '-moz-' + gradient);
	track.css('background', '-ms-' + gradient);
	track.css('background', '-webkit-' + gradient);
	track.css('background', gradient);
}

function updatePreview(type) {
	function calculateBriAlpha() {
		var bri = $('#bri-slider').val()/255;
		var briVal = bri * 0.4;
		var alpha = 0.6 + briVal;
		return alpha;
	}
	
	function updateBoxShadow() {
		var on = $('#power').prop("checked");
		var lightBg = $('#light-bg');
		var color = lightBg.css('background-color');
		if (on) {
			lightBg.css('box-shadow', 'inset #000 0 0 4px 3px, '+color+' 0 0 8px 4px');
		} else {
			lightBg.css('box-shadow', 'inset #000 0 0 4px 4px');
		}
	}
	
	function hsv2rgb(hsv) {
		var h = hsv.hue, s = hsv.sat, v = hsv.val;
		var rgb, i, data = [];
		if (s === 0) {
			rgb = [v,v,v];
		} else {
			h = h / 60;
			i = Math.floor(h);
			data = [v*(1-s), v*(1-s*(h-i)), v*(1-s*(1-(h-i)))];
			switch(i) {
			  case 0:
				rgb = [v, data[2], data[0]];
				break;
			  case 1:
				rgb = [data[1], v, data[0]];
				break;
			  case 2:
				rgb = [data[0], v, data[2]];
				break;
			  case 3:
				rgb = [data[0], data[1], v];
				break;
			  case 4:
				rgb = [data[2], data[0], v];
				break;
			  default:
				rgb = [v, data[0], data[1]];
				break;
			}
		}
		return rgb;
	}

	function ct2rgb(ct) {
		ct = (1000000 / ct) / 100;
		var rgb = {};
		rgb.r = ct <= 66 ? 255 : 329.698727446 * Math.pow((ct-60), -0.1332047592);
		if (ct <= 66) {
			rgb.g = 99.4708025861 * Math.log(ct)-161.1195681661;
		} else {
			rgb.g = 288.1221695283 * Math.pow((ct-60), -0.0755148492);
		}
		if (ct >= 66) {
			rgb.b = 255;
		} else if (ct <= 19) {
			rgb.b = 0;
		} else {
			rgb.b = 138.5177312231 * Math.log(ct-10)-305.0447927307;
		}
		for (var type in rgb) {
			rgb[type] = Math.min(255, Math.max(0, Math.round(rgb[type])));
		}

		return rgb;
	}

	function ct2display(ct) {
		return ct2rgb(ct - 90);
	}
	
	var a = calculateBriAlpha();
	
	if (type == 'bri') {
		type = localStorage.colorType;
	}
	
	switch (type) {
	case "hs":
		var hsv = {
			hue: parseInt($('#hue-slider').val()),
			sat: parseInt($('#sat-slider').val())/255,
			val: 1,
		}
		var rgb = hsv2rgb( hsv );
		var r = parseInt(rgb[0] * 255);
		var g = parseInt(rgb[1] * 255);
		var b = parseInt(rgb[2] * 255);
		break;
	case "ct":
		var ct = parseInt($('#ct-slider').val());
		var rgb = ct2display( ct );
		var r = rgb.r;
		var g = rgb.g;
		var b = rgb.b;
		break;
	}
	
	var color = 'rgba('+r+', '+g+', '+b+', '+a+')';
	var lightBg = $('#light-bg');
	lightBg.css('background-color', color);
	updateBoxShadow();
	
}

/* Control a single light or a group */
function controlLights(action) {
	var power = $('#power').prop("checked");
	var bri = parseInt($('#bri-slider').val());
	var ct = parseInt($('#ct-slider').val());
	var hue = parseInt($('#hue-slider').val()) * 182;
	var sat = parseInt($('#sat-slider').val());
	
	// Update "last" values
	localStorage.lastPower = power;
	localStorage.lastBri   = bri;
	localStorage.lastCt    = ct;
	localStorage.lastHue   = hue;
	localStorage.lastSat   = sat;
	
	setTimeout(function() {
		var lastPower = (localStorage.lastPower == 'true');
		if(
			power != lastPower ||
			bri   != parseInt(localStorage.lastBri) ||
			ct    != parseInt(localStorage.lastCt) ||
			hue   != parseInt(localStorage.lastHue) ||
			sat   != parseInt(localStorage.lastSat)
		) {
			// Still moving, don't send update
		} else {
			
			var state = {};
	
			switch(action) {
			case 'power':
				state.on = power;
				break;
			case 'bri':
				state.bri = bri;
				break;
			case 'ct':
				state.ct = ct;
				break;
			case 'hs':
				state.hue = hue;
				state.sat = sat;
				break;
			default:
				console.log('controlLights(action): var \'action\' is empty');
			}
			
			if(localStorage.controlType == 'lights') {
				var url = '/state';
			} else {
				var url = '/action';
			}
	
			$.ajax({
				type: 'PUT',
				url: localStorage.api + localStorage.controlType + '/' + localStorage.controlID + url,
				dataType: 'JSON',
				data: JSON.stringify(state),
			}).done(function(bridgeResponse) {
				if(typeof bridgeResponse[0] !== 'undefined' && typeof bridgeResponse[0].success !== 'undefined') {
					// Light or group updated successfully
				} else {
					// The bridge returned an error
					console.log("controlLights() failed:");
					console.log(bridgeResponse);
				}
			}).fail(function( jqxhr, textStatus, error ) {
				// There was an error communicating with the bridge
				console.log("controlLights() failed:\ntextStatus: " + textStatus + "\nerror: " + error);
			});
		}
	}, 100);
}

$(document).ready(function(){
	/* Setup external toolbars and panels */
	$("[data-role='navbar']").navbar();
	$("[data-role='header'], [data-role='footer']").toolbar();
	$("[data-role='panel']").panel().enhanceWithin();
	
	$(document).on("pagecontainerchange", function() {
		
		/* Update the contents of the toolbars when changing pages */
		
		// Get 'data-nav' and 'data-title' attributes
		var currentNav = $(".ui-page-active").jqmData("nav");
		var currentTitle = $(".ui-page-active").jqmData("title");
		// Change the heading
		$("[data-role='header'] h1").text(currentTitle);
		// Remove active class from nav buttons
		$("[data-role='navbar'] a.ui-btn-active").removeClass("ui-btn-active");
		// Add active class to current nav button
		$("[data-role='navbar'] a").each(function() {
			if ($(this).text() === currentNav ) {
				$(this).addClass("ui-btn-active");
			}
		});
		
		/* Perform actions on individual page changes */
		switch(currentNav) {
		case "Lights":
			updateList('lights');
			break;
		case "Groups":
			updateList('groups');
			break;
		case "Alarms":
			updateList('schedules');
			break;
		case "Sensors":
			updateList('sensors');
			break;
		case "Rules":
			updateList('rules');
			break;
		case "Control":
			$('#hue-slider').on('change', function() {
				updateSat();
				localStorage.colorType = "hs";
				updatePreview('hs');
				controlLights('hs');
			});
			$('#sat-slider').on('change', function() {
				localStorage.colorType = "hs";
				updatePreview('hs');
				controlLights('hs');
			});
			$('#ct-slider').on('change', function() {
				localStorage.colorType = "ct";
				updatePreview('ct');
				controlLights('ct');
			});
			$('#bri-slider').on('change', function() {
				updatePreview('bri');
				controlLights('bri');
			});
			$('#power').on('change', function() {
				updatePreview('bri');
				controlLights('power');
			});
			
			$.getJSON(localStorage.api + localStorage.controlType + '/' + localStorage.controlID).done(function(lights) {
				if(typeof lights.action === 'object') {
					lights.state = lights.action;
				}
				
				if (typeof lights.state === 'object') {
					//console.log(lights.state);
					$("[data-role='header'] h1").text(lights.name);
					$('#power').prop('checked', lights.state.on).flipswitch('refresh');
					$('#bri-slider').val(lights.state.bri).slider('refresh');
					$('#hue-slider').val(lights.state.hue / 182).slider('refresh');
					$('#sat-slider').val(lights.state.sat).slider('refresh');
					$('#ct-slider').val(lights.state.ct).slider('refresh');
					updateSat();
					var colormode = (lights.state.colormode == 'ct') ? 'ct' : 'hs';
					if (colormode === 'ct') {
						//console.log("Color mode: ct");
						$('#hue-label').prop('checked', false);
						$('#ct-label').prop('checked', true);
						localStorage.colorType = 'ct';
					} else {
						//console.log("Color mode: hs");
						$('#ct-label').prop('checked', false);
						$('#hue-label').prop('checked', true);
						localStorage.colorType = 'hs';
					}
					$('#color-controls-tabs').controlgroup('refresh');
					$('.color').trigger('change');
					updatePreview(colormode);
				}
			});
			break;
		default:
		}
	});
	
	$(document).on("pagecontainershow", function(event, ui) {
		if (ui.prevPage.jqmData('nav') == 'Control') {
			// Remove localStorage items upon page change away from control UI
			localStorage.removeItem('controlType');
			localStorage.removeItem('controlID');
			localStorage.removeItem('colorType');
			localStorage.removeItem('lastPower');
			localStorage.removeItem('lastBri');
			localStorage.removeItem('lastSat');
			localStorage.removeItem('lastHue');
			localStorage.removeItem('lastCt');
		}
	});
	
	$(".color").on("change", function() {
		if ($("#hue-label").prop('checked')) {
			$("#hue-sat").show();
			$("#ct").hide();
		} else {
			$("#hue-sat").hide();
			$("#ct").show();
		}
	});
	
	/* Perform initial setup */
	if (localStorage.appSetup != "true") {
		/* Initial setup functions */
		
		// Register HueCentral with the bridge
		function registerWithBridge() {
			var data = JSON.stringify({
				devicetype: localStorage.apiDeviceType,
				username: localStorage.apiName
			});
			$.ajax({
				url: localStorage.address+"/api/",
				data: data,
				dataType: 'json',
				method: 'POST'
			}).done(function(bridgeResponse){
				if(typeof(bridgeResponse[0].error) !== "undefined" && bridgeResponse[0].error.type == 101) {
					// Bridge link button not pressed. Wait 2 seconds, then try again.
					setTimeout(registerWithBridge, 2000);
				} else if (typeof(bridgeResponse[0].success) !== "undefined") {
					// Api name is registered. HueCentral is ready to use
					localStorage.appSetup = "true";
					$("#initial-setup-bridge-link p").text(
						"Setup complete! Press the button below to " +
						"using HueCentral."
					);
					$("#initial-setup-complete").show();
				} else {
					$("#initial-setup-bridge-link p").text(
						"An unknown error occurred while attempting to " +
						"register HueCentral with the bridge."
					);
					console.log(bridgeResponse);
				}
			}).fail(function( jqxhr, textStatus, error ) {
				var err = textStatus + ", " + error;
				console.log( "Request Failed: " + err );
				$("#initial-setup-bridge-link p").text(
					"An error occurred while attempting to communicate with the bridge."
				);
			});
		}
		
		// Automatically fetch bridge IP address from Hue portal
		function getAddressFromPortal() {
			$.ajax({
				url: "https://www.meethue.com/api/nupnp?callback=?",
				crossDomain: true,
				cache: true
			}).done(function(data){
				if(typeof(data[0].internalipaddress) !== "undefined") {
					localStorage.address = "http://" + data[0].internalipaddress;
					$("#initial-setup-ip-address-result p").text("Found bridge!");
					$("#initial-setup-ip-address-result").hide();
					$("#initial-setup-bridge-link").show();
					registerWithBridge();
				} else {
					$("#initial-setup-ip-address-result p").text(
						"HueCentral could not find your bridge. You will " +
						"have to enter the address manually."
					);
				}
			}).fail(function( jqxhr, textStatus, error ) {
				var err = textStatus + ", " + error;
				console.log( "Request Failed: " + err );
				$("#initial-setup-ip-address-result p").text(
					"HueCentral could not find your bridge. You will " +
					"have to enter the address manually."
				);
			});
		}
		
		// Redirect to #initial-setup
		$(":mobile-pagecontainer").pagecontainer("change", "#initial-setup");
		$("#navbar").hide();
		$("#initial-setup-api-name").show();
		$("#api-name-button").click(function() {
			var devName = $("#api-name").val();
			localStorage.apiDeviceType = "HueCentral#" + devName;
			var apiName = "HueCentral-" + encodeURIComponent(devName.replace(/\s+/g, '_'));
			localStorage.apiName = apiName.slice(0, 40);
			$("#initial-setup-api-name").hide();
			$("#initial-setup-ip-address").show();
		});
		$("#ip-address-button").click(function(){
			$("#initial-setup-ip-address").hide();
			$("#initial-setup-ip-address-result").show();
			getAddressFromPortal();
		});
		$("#initial-setup-complete").click(function() {
			$("#navbar").show();
			$(":mobile-pagecontainer").pagecontainer("change", "#home");
		});
	}
});