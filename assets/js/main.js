/*global  $, debouncem I18n */
/*eslint camelcase: 0, no-underscore-dangle: 0, no-unused-vars: 0, no-console: 0*/
var p;
$(document).ready(function () {
  var w, h,
    Key = {
      ESC: 27,
      LEFT:   37,
      UP:     38,
      RIGHT:  39,
      DOWN:   40
    },
    panorama = {
      step: 0,
      el: $("#panorama"),
      surface: undefined,
      container: undefined,
      surface_position: 0,
      container_position: 0,
      origin: 0,
      panels: {
        names: ["1", "2", "3", "4"],
        w: [],
        elem: [],
        path: "../assets/images/panels/",
        count: 4
      },
      offset: {
        left: 0,
        right: 0
      },
      story_width: 0,
      width: 0,
      left_width: 0,
      right_width: 0,
      init: function () {
        var t = this;
        t.surface = t.el.find(".surface");
        t.container = t.el.find(".container");
        console.log(panorama.surface);
      },
      audio: {
        ext: /opera/i.test(navigator.userAgent) || /firefox/i.test(navigator.userAgent) ? "ogg" : "mp3",
        path: "../assets/sounds/",
        names: ["1", "2", "3", "4"],
        elem: [],
        play_range: [[0, 25], [25, 50], [50, 75], [75, 100]], // range in percents where specific based on index audio should play
        count: 4,
        current: -1,
        muted: true,
        toggle: $("#sound_toggle"),
        default_volume: 0.1,
        volume: function (v) {
          if(v >= 0 && v <= 1) {
            this.elem.forEach(function (el) {
              el.volume = v;
            });
          }
        },
        play: function (ind) {
          if(typeof ind === "undefined") { ind = 0; }
          if(ind >= 0 && ind < this.count) {
            var snd = this.elem[ind];
            if(typeof snd !== "undefined" && snd.readyState == 4) {
              console.log("Playing", ind);
              this.stop(this.current);
              snd.volume = this.default_volume;
              snd.muted = this.muted;
              snd.play();
              this.current = ind;
            }
          }
        },
        stop: function (ind) {
          if(typeof ind === "undefined") { ind = this.current; }
          if(ind >= 0 && ind < this.count) {
            var snd = this.elem[ind];
            if(typeof snd !== "undefined" && snd.readyState == 4) {
              snd.pause();
              snd.currentTime = 0;
             // if (window.chrome) this.sounds[name].load()
            }
          }
        },
        mute: function () {
          this.muted = true;
          this.elem[this.current].muted = true;
          this.toggle.addClass("muted");
        },
        unmute: function () {
          this.muted = false;
          this.elem[this.current].muted = false;
          this.toggle.removeClass("muted");
        },
        muteToggle: function () {
          this.muted ? this.unmute() : this.mute();
        }

      }
    },
    popup = {
      el: $("#popup"),
      content: $("#popup .content"),
      close: function () {
        this.el.attr("data-type", "");
      },
      open: function (v) {
        this.el.attr("data-type", v);
        this.content.style({ "height": (h > 760 ? h - 88 - 61 - 60 - 10 : h) + "px" });
      }
    },
    // resourceLoaded: false,
    keyboardOn = true,
    nav_menu = $(".nav-menu");
  function analyze_position (pos) {
    var normalized_pos = -1*((pos + panorama.left_width) % panorama.story_width), percent;
    if(normalized_pos < 0) { normalized_pos = panorama.story_width + normalized_pos; }
    normalized_pos += origin;
    percent = normalized_pos * 100 / panorama.story_width;
    panorama.audio.play_range.forEach(function (d, i) {
      console.log(percent, d[0], d[1]);
      if(percent >= d[0] && percent < d[1]) {
        if(i !== panorama.audio.current) {
          panorama.audio.play(i);
        }
      }
    });
    console.log("analyze_position",  normalized_pos);
  }
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
        analyze_position(pos);
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
      analyze_position(pos);
    }
    var panorama_scroll_left = debounce(function () { panorama_scroll(-1); }, 100),
      panorama_scroll_right = debounce(function () { panorama_scroll(1); }, 100);

    $(document).keydown(function ( event ) {
      if(keyboardOn) {
        if (!event) {event = window.event;} // for IE compatible
        var keycode = event.keyCode || event.which; // also for cross-browser compatible
        if (keycode == Key.LEFT) { console.log("left"); panorama_scroll_left(); }
        if (keycode == Key.RIGHT) { console.log("right"); panorama_scroll_right(); }
        if(keycode === Key.ESC) { popup.close(); }
      }
    });
    $(document).on("mousewheel", function (event) {
      console.log("scroll");
      event.deltaY > 0 ? panorama_scroll_left() : panorama_scroll_right();
    });

    $(".nav-menu-toggle").on("click", function () {
      var tmp = nav_menu.attr("data-menu");
      nav_menu.attr("data-menu", tmp === "main" ? "" : "main");
    });
    $(".nav-sub-menu-toggle").on("click", function () {
      var tmp = nav_menu.attr("data-menu");
      nav_menu.attr("data-menu", tmp === "main" ? "sub" : "main");
    });
    $("#sound_toggle").click(function () { panorama.audio.muteToggle(); });
    I18n.remap();

    popup.el.find(".close, .bg").on("click", function () { popup.close(); });
    nav_menu.find("a[data-popup-target]").on("click", function () {
      console.log("---test---");
      popup.open($(this).attr("data-popup-target"));
    });
  }

  function redraw () {
    console.log("redraw");
  }

  function resize () {
    w = $(document).width();
    h = $(document).height();
    step = w/5;
    origin = w/2;
  }
  function load_callback () {
    console.log("last was loaded");
    var tmp, tmp_w = 0, tmp_i = 0;

    panorama.panels.elem.forEach(function (d){
      tmp = d.width();
      panorama.panels.w.push(tmp);
      panorama.width += tmp;
    });
    panorama.story_width = panorama.width;

    while(tmp_w < w) {
      panorama.container.append("<div class='panel'><object id='panel_r" + (tmp_i + 1) + "' type='image/svg+xml' data='" + panorama.panels.path + panorama.panels.names[tmp_i] + ".svg'></object></div>");
      tmp_w += panorama.panels.w[tmp_i];
      tmp_i = ++tmp_i % 4;
    }
    panorama.right_width = tmp_w;
    panorama.width += tmp_w;

    tmp_w = 0, tmp_i = 3;
    // console.log(w);
    while(tmp_w < w) {
      panorama.container.prepend("<div class='panel'><object id='panel_l" + (tmp_i + 1) + "' type='image/svg+xml' data='" + panorama.panels.path + panorama.panels.names[tmp_i] + ".svg'></object></div>");
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
    //panorama.audio.play(0);
  }
  function load_audio () {

    var cnt = 0, tmp,
      expect_cnt = panorama.audio.count,
      ext = panorama.audio.ext,
      path = panorama.audio.path;

    panorama.audio.names.forEach(function (d) {
      panorama.audio.elem.push($("<audio>",
      {
        preload:'auto',
        loop: true,
          on:
          {
            canplay: function() { if(++cnt === expect_cnt) { setTimeout(load_callback, 100); } },
            error: function(e) {
              console.log(this, e, "error in load audio for one of the file");
            }
          },
          "src": (path + d + "." + ext)
        }).get(0))
    });
  }
  function load_panels () {
    var cnt = 0, tmp;
    panorama.panels.names.forEach( function (d, i) {
      tmp = panorama.container.find("#panel_" + (i+1));
      panorama.panels.elem.push(tmp);
      tmp.on("load", function (){ if(++cnt === 4) { setTimeout(load_audio, 100); } });
      tmp.attr("data", panorama.panels.path + d + ".svg");
    });
  }


  (function init () {
    panorama.init();
    p = panorama;
    I18n.init(function (){
      load_panels();
      resize();
      redraw();
      bind();
    });

  })();
});



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
