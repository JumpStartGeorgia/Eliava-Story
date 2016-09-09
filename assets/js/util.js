function debounce (func, wait, immediate) {
  var timeout;
  return function () {
    var context = this, args = arguments;
    var later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}
(function (){

  if(!String.prototype.trim)
  {
    String.prototype.trim = function (c) {
      var r = (!c) ? new RegExp('^\\s+|\\s+$', 'g') : new RegExp('^'+c+'+|'+c+'+$', 'g');
      return this.replace(r, "");
    };
  }
  if(!String.prototype.triml)
  {
    String.prototype.triml = function (c) {
      var r = (!c) ? new RegExp('^\\s+') : new RegExp('^'+c+'+');
      return this.replace(r, "");
    };
  }
  if(!String.prototype.trimr)
  {
    String.prototype.trimr = function (c) {
      var r = (!c) ? new RegExp('\\s+$') : new RegExp(c+'+$');
      return this.replace(r, "");
    };
  }


  function decimalAdjust (type, value, exp) {
    // If the exp is undefined or zero...
    if (typeof exp === "undefined" || +exp === 0) {
      return Math[type](value);
    }
    value = +value;
    exp = +exp;
    // If the value is not a number or the exp is not an integer...
    if (isNaN(value) || !(typeof exp === "number" && exp % 1 === 0)) {
      return NaN;
    }
    // Shift
    value = value.toString().split("e");
    value = Math[type](+(value[0] + "e" + (value[1] ? (+value[1] - exp) : -exp)));
    // Shift back
    value = value.toString().split("e");
    return +(value[0] + "e" + (value[1] ? (+value[1] + exp) : exp));
  }

  // Decimal round
  if (!Math.round10) {
    Math.round10 = function(value, exp) {
      return decimalAdjust("round", value, exp);
    };
  }
  // Decimal floor
  if (!Math.floor10) {
    Math.floor10 = function(value, exp) {
      return decimalAdjust("floor", value, exp);
    };
  }
  // Decimal ceil
  if (!Math.ceil10) {
    Math.ceil10 = function(value, exp) {
      return decimalAdjust("ceil", value, exp);
    };
  }
  if (!Math.round5) {
    Math.round5 = function(value) {
      return (value / 5) * 5;
    };
  }
})();
function exist(v) { return typeof v !== 'undefined' && v !== null && v !== '';}
function isNumber(v) { return /^\d+$/.test(v); }
// Returns a random integer between min (included) and max (included)
// Using Math.round() will give you a non-uniform distribution!
function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
// This is a function
function Normalizer(min, max) {
  return function(val) {
    return (val - min) / (max - min);
  }
}

// This is another
function Interpolater(min, max, clamp) {
  return function(val) {
    val = min + (max - min) * val;
    return clamp ? Math.min(Math.max(val, min), max) : val;
  }
}

// This is a third
function Scale() {
  var domain = new Normalizer(0, 1);
  var range = new Interpolater(0, 1);
  var s = function(val) {
    return range(domain(val));
  };
  s.domain = function(min, max) {
    if (!arguments.length) return domain;
    domain = new Normalizer(min, max)
    return s
  };
  s.range = function(min, max, clamp) {
    if (!arguments.length) return range;
    range = new Interpolater(min, max, clamp)
    return s
  };
  return s;
}

function transformX (pos) {
  var tmp = "translateX(" + pos + "px)", obj = {};
  obj["-webkit-transform"] = tmp;
  obj["-ms-transform"] = tmp;
  obj["transform"] = tmp;
  return obj;
}
