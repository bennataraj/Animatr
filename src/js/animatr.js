/*!
* Animatr v0.1.0 - CSS3 animations with HTML5 data-attributes
* Copyright 2014 @sprawld http://sprawledoctopus.com/animatr/
* MIT License. Requires jQuery.Keyframes & PrefixFree
*/

;(function ( $, window, document, undefined ) {
	'use strict';
	
    $.fn.animatr = function(opts) {
		return Animatr(this,opts);
	}
	
	$.animatr = function(opts) {
		return Animatr(this('body *'),opts);
	}

	
	// Plugin data:
	var global = {
		keyframes: getKeyframes(),	//object with @keyframes read from CSS
		animations: []				//array with new keyframes created by Animatr
	};	

	
	// Library functions:

	// Merge - used to combine two Keyframe objects.
	function merge(obj1, obj2) {
		for(var attrname in obj2) {
			if(obj1.hasOwnProperty(attrname) ) obj1[attrname] = $.extend(obj1[attrname],obj2[attrname]);
			else obj1[attrname] = obj2[attrname];
		}
	}

	
	// Convert CSS string to Object:
	
	// Convert keyframe string into an object
	function getKeyframeObj(text) {
		var obj = {};
		text.replace(/([0-9]*\%)[^\{\}]*\{([^\}\{]*)\}/g,function($1,$2,$3) { 
			if(obj.hasOwnProperty($2)) $.extend(obj[$2],getCSSObj($3) );
			else obj[$2] = getCSSObj($3);
		});
		return obj;
	}

	// Convert CSS string into an object
	function getCSSObj(text) {
		var obj = {};
		text.replace(/([a-zA-Z_-]+)[^\w:]*:\s*([^;]+)/g,function($1,$2,$3) { obj[$2] = $3; });
		return obj;
	}

	// Convert pseudo-CSS (from Animation Settings) into an object, converting snake-case property names to camelCase
	function getCamelCaseObj(text) {
		var obj = {};
		text.replace(/([\-\w]+)[^\-\w:]*:\s*([^;]+)/g,function($1,$2,$3) {
			obj[ $2.replace(/(\-[a-z])/g, function($1){return $1.toUpperCase().replace('-','');}) ] = $3;
		});
		return obj;
	}

	
	// Convert Objects into CSS strings:
	// CSS properties are added in alphabetical order, so that string comparison will identify identical objects
	
	// Convert a CSS object into a string
	function getObjCSS(obj) {
		var arr = [], text = "";
		for(var i in obj) arr.push([i,obj[i]]);
		arr.sort(function(a,b) { return a[0]-b[0]; });
		for(var i=0;i<arr.length;i++) text+= arr[i][0]+':'+arr[i][1]+';';
		return text;
	}
	
	// Convert a keyframes object to string
	function getObjKeyframes(obj) {
		var arr = [], text = "";
		for(var i in obj) arr.push([parseFloat(i),getObjCSS(obj[i])]);
		arr.sort(function(a,b) { return a[0]-b[0]; });
		for(var i=0;i<arr.length;i++) text+= arr[i][0]+'%{'+arr[i][1]+'}';
		return text;
	}
	
	

	// Create keyframes objects of any @keyframes in the CSS that can be read (depends on CORS)
	function getKeyframes() {
		var styles = document.styleSheets;
		var type = window.CSSRule.WEBKIT_KEYFRAMES_RULE || window.CSSRule.KEYFRAMES_RULE;
		var keyframes = {};
		for (var declaration in styles) {
			try {
				if (styles.hasOwnProperty(declaration)) {
					var ruleSet = styles[declaration].cssRules;
					for (var rule in ruleSet) {
						if (ruleSet.hasOwnProperty(rule)) {
							var currentRule = ruleSet[rule];
							if (currentRule.type == type) {
								currentRule.cssText.replace(/[\r\n]/g,'').replace(/^@keyframes\W+(\w+)[^\w\{]*\{(.*)\}\W*$/,function($1,$2,$3) {
								keyframes[$2] = getKeyframeObj($3);
								});
							}
						}
					}
				}
			}
			catch(e) {
			}
		}
		return keyframes;
	}

	// Check element for any data-t attributes, and return a config object
	function getAttributes(obj,settings) {
		var data = {};
		$.each(obj[0].attributes, function() {
			if(this.specified) {
				var value = this.value
				this.name.replace(/^(data-t([1-9][0-9]*)?)((-([0-9]*)(\.[0-9]+)?(\%)?)|-loop)?$/, function($1,$2,$3,$4,$5,$6,$7,$8) {
					if(!data.hasOwnProperty($2)) data[$2]= {
						key: [],
						anim: [],
						config: $.extend({},settings),
					};
					var time = parseFloat($6+$7);
					if($4 === "-loop") data[$2].config["iterationCount"] = parseInt(value) || "infinite";
					else if($1 === $2) data[$2].config = $.extend(data[$2].config,getCamelCaseObj(value));
					else if($8 === "%" && time >= 0 && time <= 100) data[$2].key.push( [time,value] );
					else if( time >= 0 ) data[$2].anim.push( [time,value] );
				});
			}
		});
		return data;
	}

	// Add a new set of animation keyframes to global store *if* it is new
	function addAnim(frames) {
		var length = global.animations.length;
		var anim = getObjKeyframes(frames);
		for(var i=0;i<length;i++) {
			if(global.animations[i] == anim) return i;
		}
		
		frames.name = 'Animatr'+length;
		$.keyframe.define([frames]);
		global.animations.push(anim);
		return length;
	}
	
	// restart animation
	function replayAnimation(obj) {
		if(obj.data('Animatr')) {
			obj.resetKeyframe(function() {
				var temp = obj[0].offsetWidth; //Trigger reflow
				obj.playKeyframe(obj.data('Animatr'));
			});
		}
	}


	// Main function:
	
	function Animatr(selector,opts) {

		var settings = {duration: '10s',delay:'0s'};
		if(opts) {
			if(typeof opts === "string") {
				switch( opts.toLowerCase() ) {
					case "pause":
						return selector.each(function() { $(this).pauseKeyframe(); });
					case "play":
						return selector.each(function() { $(this).resumeKeyframe(); });
					case "restart":
						return selector.each(function() { replayAnimation($(this)); });
					default:
						settings = $.extend(settings,getCamelCaseObj(opts));
				}
			}
		}
		return selector.each(function(){                                                                                                                            
			var obj = $(this);
			if( !obj.data('Animatr') ) {

				var data = getAttributes(obj, settings);				
				if(!$.isEmptyObject(data)) {
					for(var i in data) { 
						var length = data[i].anim.length;
						if(length) {	
							data[i].anim.sort(function(a,b) {return a[0]-b[0]});
							var max = data[i].anim[length-1][0];
							if(max>0) data[i].config["duration"] = max+'s';
							for(var j=0;j<length;j++) {
								var percent = parseInt(data[i].anim[j][0] * 10000 / max)/100;
								data[i].key.push( [percent, data[i].anim[j][1]] )
							}
						}
					}

					var instructions = [];
					for(var i in data) {
						var frames = {};
						
						data[i].key.sort(function(a,b) {return a[0]-b[0];});
						var keyLength = data[i].key.length;
						
						for(var j=0;j<data[i].key.length;j++) {
							var css = {};
							css[data[i].key[j][0]+'%'] = getCSSObj(data[i].key[j][1]);
							merge(frames,css);
						}
						
						if(data[i].config.keyframes) {
							var remaining = [];
							data[i].config.keyframes.replace(/[a-zA-Z0-9\-_]+/g,function ($1) {
								if(global.keyframes.hasOwnProperty($1)) merge(frames,global.keyframes[$1]);
								else remaining.push($1);
							});
							
							if(remaining.length) {
								for(var n=0;n<remaining.length;n++) {
									var copyConfig = $.extend(true,{},data[i].config);
									copyConfig["name"] = remaining[n];
									instructions.push(copyConfig);
								}
							}
						}
						data[i].config.name = "Animatr" + addAnim(frames);
						instructions.push(data[i].config);
					}
		
					if(instructions.length) obj.playKeyframe(instructions).data('Animatr',instructions);
				}
			}
		});
	}
	
})( jQuery, window, document );