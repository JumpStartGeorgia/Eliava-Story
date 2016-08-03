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
})();
function exist(v) { return typeof v !== 'undefined' && v !== null && v !== '';}
function isNumber(v) { return /^\d+$/.test(v); }
