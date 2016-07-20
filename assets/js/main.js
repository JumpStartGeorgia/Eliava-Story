/*global  $, debounce */
/*eslint camelcase: 0, no-underscore-dangle: 0, no-unused-vars: 0, no-console: 0*/

$(document).ready(function () {
  var w, h,
    Key = {
      LEFT:   37,
      UP:     38,
      RIGHT:  39,
      DOWN:   40
    },
    panorama = {
      step: $(document).width()/5,
      el: $("#panorama"),
      surface: undefined,
      container: undefined,
      surface_position: 0,
      container_position: 0,
      panels: {
        names: ["a", "b", "c", "d"],
        w: [],
        elem: []
      },
      offset: {
        left: 0,
        right: 0
      },
      width: 0,
      left_width: 0,
      right_width: 0,
      init: function () {
        var t = this;
        t.surface = t.el.find(".surface");
        t.container = t.el.find(".container");
        console.log(panorama.surface);
      }
    },
    keyboardOn = true;
  function flip (pos) {
    if(pos <= -1 * panorama.offset.right) {
      console.log("flip to beggining");
      panorama.container_position = -1 * panorama.offset.left;
      panorama.container.css("transform", "translateX(" + (-1 * panorama.offset.left) + "px)");
    }
    else if(pos >= w - panorama.offset.left) {
      console.log("flip to the end");
      panorama.container_position = -1 * (panorama.offset.right - w);
      panorama.container.css("transform", "translateX(" + (-1 * (panorama.offset.right - w)) + "px)");
    }
  }
  function bind () {

    $(window).resize(function () { resize(); });
    panorama.surface.draggable({
      axis: "x",
      drag: function (event, ui) {
        var pos = panorama.container_position + (ui.position.left - panorama.surface_position);
        panorama.surface_position = ui.position.left;

        if(pos <= -1 * panorama.offset.right || pos >= w - panorama.offset.left) {
          flip(pos);
        }
        else {
          panorama.container_position = pos;
          panorama.container.css("transform", "translateX(" + pos + "px)");
        }
      },
      stop: function (event, ui) {
        panorama.surface.css("left", 0);
        panorama.surface_position = 0;
      }
    });

    function panorama_scroll (direction) {
      var pos = panorama.container_position + -1*direction*panorama.step;

      if(pos <= -1 * panorama.offset.right || pos >= w - panorama.offset.left) {
        flip(pos);
      }
      else {
        panorama.container_position = pos;
        panorama.container.animate({ transform : "translateX(" + pos + "px)" }, { duration: 500 }, "linear");
      }
    }
    var panorama_scroll_left = debounce(function () { panorama_scroll(-1); }, 100),
      panorama_scroll_right = debounce(function () { panorama_scroll(1); }, 100);

    $(document).keydown(function ( event ) {
      if(keyboardOn) {
        if (!event) {event = window.event;} // for IE compatible
        var keycode = event.keyCode || event.which; // also for cross-browser compatible
        if (keycode == Key.LEFT) { console.log("left"); panorama_scroll_left(); }
        if (keycode == Key.RIGHT) { console.log("right"); panorama_scroll_right(); }
      }
    });
  }

  function redraw () {
    console.log("redraw");
  }

  function resize () {
    w = $(document).width();
    h = $(document).height();
  }

  function load () {
    var cnt = 0, tmp;

    function callback_onload () {
      console.log("last was loaded");

      panorama.panels.elem.forEach(function (d){
        tmp = d.width();
        panorama.panels.w.push(tmp);
        panorama.width += tmp;
      });
      // console.log(panorama.panels.w);

      var tmp_w = 0, tmp_i = 0;
      while(tmp_w < w) {
        panorama.container.append("<div class='panel'><object id='panel_r" + (tmp_i + 1) + "' type='image/svg+xml' data='../assets/images/" + panorama.panels.names[tmp_i] + ".svg'></object></div>");
        tmp_w += panorama.panels.w[tmp_i];
        tmp_i = ++tmp_i % 4;
      }
      panorama.right_width = tmp_w;
      panorama.width += tmp_w;

      tmp_w = 0, tmp_i = 3;
      // console.log(w);
      while(tmp_w < w) {
        panorama.container.prepend("<div class='panel'><object id='panel_l" + (tmp_i + 1) + "' type='image/svg+xml' data='../assets/images/" + panorama.panels.names[tmp_i] + ".svg'></object></div>");
        tmp_w += panorama.panels.w[tmp_i];
        // console.log(w, panorama.panels.w, tmp_i);
        if(--tmp_i === 0) tmp_i = 3;
      }
      panorama.left_width = tmp_w;
      panorama.width += tmp_w;

      panorama.offset.right = panorama.width - panorama.right_width;
      panorama.offset.left = panorama.left_width;

      panorama.container_position = -1 * tmp_w;
      panorama.container
        .css("transform", "translateX(" + (-1 * tmp_w) + "px)");

      console.log(panorama);
      // t.el.svg = obj.node().contentDocument;
      // t.svg_overlay = d3.select(obj_overlay.node().contentDocument.documentElement);
      // t.el.road = t.el.svg.getElementsByClassName("road")[0];
      // t.el.article = document.getElementsByClassName("article")[0];
      // t.path.length =  t.el.road.getTotalLength();
      // d3.select(t.el.road).style({ "stroke-dasharray": t.path.length + "px", "stroke-dashoffset": t.path.length + "px" });
      // if(t.path.length !== t.path.orig_length) {
      //   var rt = t.path.length/t.path.orig_length;
      //   t.point.coordinates_orig.forEach(function(d, i){ t.point.coordinates.push(d * rt); });
      // }
      // t.point.count = t.point.coordinates.length - 1;
      // t.labels();
      // t.bind();
      // callback();
    }
    panorama.panels.names.forEach( function (d, i) {
      tmp = panorama.container.find("#panel_" + (i+1));
      panorama.panels.elem.push(tmp);
      tmp.on("load", function (){ if(++cnt === 4) { setTimeout(callback_onload, 100); } });
      tmp.attr("data", "../assets/images/" + d + ".svg");
    });
  }

  (function init () {
    panorama.init();
    load();
    resize();
    redraw();
    bind();
  })();
});
