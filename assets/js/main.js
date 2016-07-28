/*global  $ debounce I18n YT */
/*eslint camelcase: 0, no-underscore-dangle: 0, no-unused-vars: 0, no-console: 0*/
var p, youtubePlayers = {};
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
        names: ["p1", "p2", "p3", "p4", "p5"], // * TODO on panel count change plus need to add div object to layout
        w: [],
        elem: [],
        path: "../assets/images/panels/",
        count: 5 // * TODO on panel count change
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
      },
      audio: {
        ext: /opera/i.test(navigator.userAgent) || /firefox/i.test(navigator.userAgent) ? "ogg" : "mp3",
        path: "../assets/sounds/",
        names: ["1", "2", "3", "4"],
        elem: [],
        play_range: [[0, 25], [25, 50], [50, 75], [75, 100]], // range in percents where specific based on index audio should play
        count: 4,
        current: -1,
        muted: false,
        toggle: $("#sound"),
        default_volume: 0.4,
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
              console.log("audio play ", ind);
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

          // var pl;
          // Object.keys(youtubePlayers).forEach(function (k) {
          //   pl = youtubePlayers[k];
          //   if(pl && typeof pl.mute === "function") { pl.mute(); }
          // });
        },
        unmute: function () {
          this.muted = false;
          this.elem[this.current].muted = false;
          this.toggle.removeClass("muted");
          // var pl;
          // Object.keys(youtubePlayers).forEach(function (k) {
          //   pl = youtubePlayers[k];
          //   if(pl && typeof pl.unMute === "function") { pl.unMute(); }
          // });
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
    loader = {
      el: $("#loader"),
      image: $("#loader_image"),
      path: undefined,
      length: 829,
      progress: 0,
      closed: false,
      inc: function (percent) {
        // console.log("percent", percent);
        var t = this;
        if(t.closed) return;
        if(typeof percent === "undefined") { percent = 0; }

        percent += t.progress;

        if(percent < 0) { percent = 0; }
        else if(percent >= 100) { t.close(); return; }

        t.progress = percent;

        if(!t.path) {
          t.path = t.image.get(0).contentDocument.getElementsByTagName("path")[0];
          $(t.path).css("stroke-dasharray", t.length + "px");
          t.length = t.path.getTotalLength();
        }
        $(t.path).animate({ "stroke-dashoffset": -1*t.length*percent/100 + "px" }, 200);
      },
      close: function () {
        var t = this;
        t.closed = true;
        t.image.hide();
        t.el.fadeOut({ duration: 2000, easing: "easeInOutCirc"});
      }
    },
    story = {
      el: $("#story_popup"),
      // content: $("#story_popup .content"),
      content: $("#story_popup .content"),
      opened: false,
      current: 1,
      count: 3, // * TODO on story count change
      close: function () {
        this.el.attr("data-current", "");
        this.el.find(".window").animate({ opacity: 0 }, 500);
      },
      open: function (id) {
        this.el.attr("data-current", id);
        this.el.find(".window").animate({ opacity: 1 }, { duration: 1000, easing: "easeInCirc" });

        // this.el.addClass("opened");
        this.resize();
      },
      resize: function () {
        var t = this;
        this.content.find(".story .text-box").css({ "height": ( t.el.find(".window").height() - t.el.find(".active .text-box").position().top - 20) + "px" });
      },
      next: function () {
        var t = this,
          cur = t.current,
          nxt = (cur+1) > t.count ? 1 : (cur+1),
          fir = t.el.find("[data-id='" + cur + "']"),
          sec = t.el.find("[data-id='" + nxt + "']").addClass("second");

        t.content
          .one("webkitAnimationEnd oanimationend msAnimationEnd animationend", function (e) {
            // console.log("end");
            t.content.removeClass("scroll-left animated");
            sec.addClass("active").removeClass("second");
            fir.removeClass("active");
          })
          .addClass("scroll-left animated");
        t.current = nxt;
      },
      prev: function () {
        var t = this,
          cur = t.current,
          prv = (cur-1) > 0 ? (cur-1): t.count,
          fir = t.el.find("[data-id='" + cur + "']").addClass("second"),
          sec = t.el.find("[data-id='" + prv + "']").addClass("first");

        t.content
          .addClass("scroll-right-origin")
          .one("webkitAnimationEnd oanimationend msAnimationEnd animationend", function (e) {
            // console.log("end");
            t.content.removeClass("scroll-right-origin scroll-right animated");
            sec.addClass("active").removeClass("first");
            fir.removeClass("active second");
          })
          .addClass("scroll-right animated");
        t.current = prv;
      },
      bind: function () {
        var t = this;
        t.el.find(".prev-toggle").click(function () { t.prev(); });
        t.el.find(".next-toggle").click(function () { t.next(); });
        t.el.find(".close, .bg").click(function () { t.close(); });
        t.resize();
      }
    },
    // resourceLoaded: false,
    keyboardOn = true,
    nav_menu = $(".nav-menu");

  function analyze_position (pos) {
    var normalized_pos = -1*((pos + panorama.left_width) % panorama.story_width), percent;
    if(normalized_pos < 0) { normalized_pos = panorama.story_width + normalized_pos; }
    normalized_pos += panorama.origin;
    percent = normalized_pos * 100 / panorama.story_width;
    panorama.audio.play_range.forEach(function (d, i) {
      // console.log(percent, d[0], d[1]);
      if(percent >= d[0] && percent < d[1]) {
        if(i !== panorama.audio.current) {
          panorama.audio.play(i);
        }
      }
    });
    // console.log("analyze_position",  normalized_pos);
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
  // * TODO tooltip for object
  function bind () {

    $(window).resize(function () { resize(); });
    // panorama.surface.click(function () {
    //   story.open(1);
    // });
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
        if (keycode == Key.LEFT) { /*console.log("left");*/ panorama_scroll_left(); }
        if (keycode == Key.RIGHT) { /*console.log("right");*/ panorama_scroll_right(); }
        if(keycode === Key.ESC) { popup.close(); }
      }
    });
    $(document).on("mousewheel", function (event) {
      /*console.log("scroll");*/
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
    $("#sound").click(function () { panorama.audio.muteToggle(); });
    I18n.remap();

    popup.el.find(".close, .bg").on("click", function () { popup.close(); });
    nav_menu.find("a[data-popup-target]").on("click", function () {
      popup.open($(this).attr("data-popup-target"));
    });

    story.bind();
  }

  function redraw () {
    console.log("redraw");
  }

  function resize () {
    w = $(document).width();
    h = $(document).height();
    panorama.step = w/5;
    panorama.origin = w/2;
    story.resize();
  }
  function load_callback () {
    loader.inc(10);
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
      tmp_i = ++tmp_i % panorama.panels.count;
    }
    panorama.right_width = tmp_w;
    panorama.width += tmp_w;

    tmp_w = 0, tmp_i = panorama.panels.count - 1;
    // console.log(w);
    while(tmp_w < w) {
      panorama.container.prepend("<div class='panel'><object id='panel_l" + (tmp_i + 1) + "' type='image/svg+xml' data='" + panorama.panels.path + panorama.panels.names[tmp_i] + ".svg'></object></div>");
      tmp_w += panorama.panels.w[tmp_i];
      // console.log(w, panorama.panels.w, tmp_i);
      if(--tmp_i === 0) tmp_i = panorama.panels.count - 1;
    }
    panorama.left_width = tmp_w;
    panorama.width += tmp_w;

    panorama.offset.right = panorama.width - panorama.right_width;
    panorama.offset.left = panorama.left_width;

    panorama.container_position = -1 * tmp_w;
    panorama.container
      .css("transform", "translateX(" + (-1 * tmp_w) + "px)");
    panorama.audio.play(0);
    panorama.audio.muteToggle();

    loader.inc(10);
  }
  function load_youtube () {
    var tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = function () {

      // var youtube_watch = d3.behavior.watch()
      //   .on("statechange", function() {
      //     var pl = youtubePlayers[d3.select(this).select("iframe").attr("data-yid")];
      //     if(pl && typeof pl.playVideo === "function") {
      //       if(d3.event.state) { pl.playVideo(); }
      //       else { pl.pauseVideo(); }
      //     }
      //   });
      $("#story_popup .story .youtube[data-yid]").each(function (d, i) {
        var id = this.id, yid = this.dataset.yid;
        youtubePlayers[yid] = new YT.Player(
          id,
          {
            videoId: yid,
            height: "600",
            width: "100%",
            playerVars:{ showinfo: 0, loop: 1, autoplay: 0, rel: 0 }//,
            //events: {
              // 'onReady': onPlayerReady,
              //onStateChange: function (event) {
                // if (event.data == YT.PlayerState.PLAYING) {
                //   if(panorama.audio.muted) {
                //     console.log(youtubePlayers[yid]);
                //     setTimeout(function() { youtubePlayers[yid].mute }, 100);
                //   } //* TODO * mute video if muted
                //   else {
                //    setTimeout(function() { youtubePlayers[yid].unMute }, 100);
                //   }
                // }
              //}
            //}
          }
        );
      });
      setTimeout(load_callback, 100);
    };
  }
  function load_audio () {
    var cnt = 0, tmp,
      expect_cnt = panorama.audio.count,
      ext = panorama.audio.ext,
      path = panorama.audio.path;

    panorama.audio.names.forEach(function (d) {
      panorama.audio.elem.push($("<audio>",
        {
          preload:"auto",
          loop: true,
          one: {
            canplay: function (event) { loader.inc(10); if(++cnt === expect_cnt) { setTimeout(load_youtube, 100); } },
            error: function (e) { console.log(this, e, "error in load audio for one of the file"); }
          },
          "src": (path + d + "." + ext)
        }).get(0));
    });
  }
  function load_panels () {
    var cnt = 0, tmp;
    panorama.panels.names.forEach( function (d, i) {
      tmp = panorama.container.find("#panel_" + (i+1));
      panorama.panels.elem.push(tmp);
      tmp.one("load", function (event){ loader.inc(8); if(++cnt === panorama.panels.count) { setTimeout(load_audio, 100); } });
      tmp.attr("data", panorama.panels.path + d + ".svg");
    });
  }


  (function init () {
    // ld = loader;
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
