/*eslint camelcase: 0, no-console:0*/
/*global document, window, console*/
var I18n = (function () {
  "use strict";
  var dev = true;
  var obj = { };
  var default_locale = "en"; // deploy change this for each language
  var locale = default_locale;
  var languages = ["en", "ka", "ru"];
  var data = null;
  var delve_threshold = 4;
  var protecting = false;
  var protectedKey;
  var protectedValue;
  var outerCallback = null;
  var log = function(v) {
    if(dev) { console.log(v); }
  };
  var nodata = function() {
    log("I18n: None of translation exists! So I18n stopped!");
  };
  var has = function(prop) {
    return window.hasOwnProperty(prop);
  };
  var init_continue = function() {
    if(typeof outerCallback === "function") { outerCallback(); }
  };
  var init_locale = function() {
    var href = window.location.href,
    tmp = href.substr(href.length-4,4),
    tmp_locale = default_locale;

    if(tmp[0] === "/" && tmp[3] === "/" && languages.indexOf(tmp.substr(1,2)) !== -1) {
      tmp_locale = tmp.substr(1,2);
    }
    else {

      tmp = window.location.search.substr(1).split("&");
      var params = {};
      var prop = "locale";
      tmp.forEach(function(d){
         var eq = d.split("=");
         params[eq[0]] = eq[1];
      });

      if(params.hasOwnProperty(prop) && languages.indexOf(params[prop]) !== -1)
      {
        tmp_locale = params[prop];
      }
    }
    locale = tmp_locale;
    document.documentElement.lang = locale;
  };
  var assign_locale = function(k, v) {
    var kCamel = "i18n";
    k.split("-").forEach(function(a){
       kCamel += a.charAt(0).toUpperCase() + a.slice(1);
    });
    k = "i18n-" + k;

    var i, d = null, all = document.querySelectorAll("[data-" + k + "]");
    for (i = 0; i < all.length; ++i) {
       d = all[i];
       if(["text", "t", ""].indexOf(d.dataset[kCamel]) !== -1)
       {
          d.innerHTML = v;
       }
       else if(["content"].indexOf(d.dataset[kCamel]) !== -1)
       {
          d.content = v;
       }
       else if(["title"].indexOf(d.dataset[kCamel]) !== -1)
       {
          d.title = v;
       }
       else if(["href"].indexOf(d.dataset[kCamel]) !== -1)
       {
          d.href = v;
       }
       else
       {
         var append_regex = /^append\[(.*?)\]$/g;
         var vv = append_regex.exec(d.dataset[kCamel]);
         if(vv !== null && vv.length === 2) {
           d.innerHTML = v + vv[1];
         }
         else {
           d.setAttribute(d.dataset[kCamel], v);
         }
       }
       d.removeAttribute("data-" + k);
    }
  };
  var delve = function(object, parent, level) {
    parent = parent || "";
    level = level || 1;
    if(level > delve_threshold) // if nesting level is greater than threshold stop
    {
       log("I18n: Nesting is limited to " + delve_threshold + " objects!");
       return;
    }
    Object.keys(object).forEach(function(key) {
       var type = typeof object[key];
       if(type === "string")
       {
          assign_locale((parent !== "" ? (parent + "-" + key) : key), object[key]);
       }
       else if(type === "object")
       {
          delve(object[key], (parent === "" ? key : parent + "-" + key), level + 1);
       }
    });
  };
  var allocate = function() {
    if(typeof data === "object") {
       delve(data);
    }
    else {
      log("I18n: Data for " + locale + " is missing!");
    }
  };
  var protect = function(v) {
    protectedKey = v;
    if(window.hasOwnProperty(protectedKey))
    {
       protectedValue = window[protectedKey];
       protecting = true;
    }
  };
  var unprotect = function() {
    if(protecting)
    {
       window[protectedKey] = protectedValue;
       protecting = false;
    }
  };
  var load_file = function(src, callback, error_callback) {
     var s = document.createElement("script");
     s.type = 'application/javascript';
     s.src = src;
     s.async = false;
     s.onreadystatechange = s.onload = function () {
         var state = s.readyState;
         if (!callback.done && (!state || /loaded|complete/.test(state))) {
             callback.done = true;
             callback();
         }
     };
     s.onerror = function(){
       if(!error_callback.done)
       {
          error_callback.done = true;
          error_callback();
       }
     };
     document.getElementsByTagName("body")[0].appendChild(s);
  };
  var load_default_locale = function() {
    unprotect();
    protect(default_locale);
    load_file("../assets/locale/" + default_locale + ".js", function() { //on success
       if(has(default_locale) && typeof window[default_locale] === "object")
       {
          data = window[default_locale];
          log("I18n: Default translation was loaded!");
          init_continue();
       }
       else
       {
          nodata();
       }
       unprotect();
    }, function() { unprotect(); nodata(); }); // end of load_file
  };
  var load_locale = function() {
    protect(locale);
    load_file("../assets/locale/" + locale + ".js", function() { //on success
      if(has(locale) && typeof window[locale] === "object" && window[locale] !== null) {
        data = window[locale];
        init_continue();
      }
      else {
        if(locale !== default_locale) {
          load_default_locale();
        }
        else { nodata(); }
      }
      unprotect();
    }, function() {
      if(locale !== default_locale) {
        load_default_locale();
      }
      else { nodata(); }
    }); // end of load_file
  };
  obj.locale = function() {
    return locale;
  };
  obj.locales = {};
  obj.t = function(path) {
    if(typeof path === "string")
    {
       var p = path;
       if(p.indexOf("data-I18n-") !== -1) {
          p = p.substr(10);
        }

       if(p.length > 0)
       {
          var pointer = data;
          p.split("-").forEach(function(d)
          {
            if(pointer.hasOwnProperty(d)) {
              pointer = pointer[d];
            }
            else {
              return false;
            }
          });
          if(typeof pointer !== "string")
          {
             return "[Translation missing]";
          }
         return pointer;
       }
    }
    log("I18n: translation missing for '" + path + "'!");
    return "";
  };
  obj.remap = function() {
    allocate();
  };
  obj.init = function(callback) {
    // console.log("I18n");
    init_locale();
    load_locale();
    outerCallback = callback;
  };

  return obj;
})();
