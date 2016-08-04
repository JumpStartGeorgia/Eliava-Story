/*global  $ debounce I18n YT global_callback exist isNumber js */
/*eslint camelcase: 0, no-underscore-dangle: 0, no-unused-vars: 0, no-console: 0*/
var p, youtubePlayers = {}, ld;
$(document).ready(function () {
  var w, h,
    Key = {
      ESC: 27,
      LEFT:   37,
      UP:     38,
      RIGHT:  39,
      DOWN:   40
    },
    lang = "en",
    global_callback = undefined,
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
        count: 5, // * TODO on panel count change
        current: 3
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
        t.container = t.el.find(".container");
      },
      audio: {
        ext: /opera/i.test(navigator.userAgent) || /firefox/i.test(navigator.userAgent) ? "ogg" : "mp3",
        path: "../assets/sounds/",
        // names of the files are number between 1 and 'count'
        elem: [],
        play_range: [ [0, 6.8], [6.8, 9.9], [9.9, 13.2], [13.2, 18.1], [18.1, 24.9], [24.9, 32.4], [32.4, 35.8], [35.8, 45.8], [45.8, 51.4], [51.4, 57], [57, 62.3], [62.3, 67.4], [67.4, 77.2], [77.2, 81.5], [81.5, 93.5], [93.5, 100] ], // range in percents where specific based on index audio should play
        count: 16,
        current: -1,
        muted: false,
        soft_muted: false,
        toggle: $(".sound-toggle"),
        default_volume: 0.4,
        dev: function () { // * TODO call panorama.audio.dev(); in current context
          // if need recalculate when audio should play, no pause in between, paste output in play_range
          var a = [560, 250, 270, 402, 556, 615, 275, 820, 460, 462, 434, 416, 800, 356, 986, 530], // pixels for each audio file to play starting from 0
            s = 8192, // sum is 8192 calculated based on width of new scan png file
            c = [], f = 0, tmp;
          if(this.count !== a.length) {
            console.log("Audio files count should be same as length of 'a' array.");
            return;
          }
          a.forEach(function (d) {
            tmp = Math.round10(d*100/s, -1);
            c.push([f, Math.round10(f+tmp, -1)]);
            f=Math.round10(f+tmp, -1);
          });
          tmp = "";
          c.forEach(function (d){ tmp += "[" + d[0] + ", " + d[1] +"], "; });
          console.log("[ " + tmp.substring(0, tmp.length - 2) + " ]" );
        },
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
              snd.muted = this.muted || this.soft_muted;
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
        softMute: function () {
          //console.log(this.elem[this.current]);
          this.soft_muted = true;
          this.elem[this.current].muted = true;
        },
        softUnMute: function () {
          this.soft_muted = false;
          if(!this.muted) {
            this.elem[this.current].muted = false;
          }
        },
        muteToggle: function () {
          this.muted ? this.unmute() : this.mute();
        }
      },
      map: {
        el: $("#nav_map"),
        bind: function () {
          var t = this, doc = t.el.get(0).contentDocument;
          $(doc).find(".story-point").click(function () {
            var tt = $(this), p = tt.parent().find(".story-point").removeClass("current");
            story.go_to(+$(this).addClass("current").attr("data-point"));

          });
          this.el.parent().removeClass("nav-map-visible");
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
        this.content.css({ "height": (h > 760 ? h - 88 - 61 - 60 - 10 : h) + "px" });
        global_callback = function () { this.close(); };
      }
    },
    loader = {
      el: $("#loader"),
      image: $("#loader_image"),
      path: undefined,
      length: 1300,
      progress: 0,
      closed: false,
      fade_duration: 0,//2000, // deploy change back this value
      fade_easing: "easeInOutCirc",
      before_close_duration: 0, //5000, // deploy change back this value
      inc: function (percent) {
        var t = this;
        if(t.closed) return;
        if(typeof percent === "undefined") { percent = 0; }

        percent += t.progress;

        if(percent < 0) { percent = 0; }
        else if(percent >= 100) { percent = 100; }

        t.progress = percent;
        // console.log(percent);
        if(!t.path) {
          t.path = t.image.get(0).contentDocument.getElementsByTagName("path")[0];
          $(t.path).css("stroke-dasharray", t.length + "px");
          t.length = t.path.getTotalLength();
        }
        $(t.path).velocity({ "stroke-dashoffset": -1*t.length*percent/100 + "px" }, { duration: 100 });

        if(percent >= 100) { t.close(); }
      },
      close: function () {
        // console.log("closed");
        var t = this;
        t.closed = true;
        setTimeout(function () {
          t.el.find(".loader-box").hide();
          t.el.fadeOut({ duration: t.fade_duration, easing: t.fade_easing});
        }, t.before_close_duration);
      }
    },
    story = {
      el: $("#story_popup"),
      // content: $("#story_popup .content"),
      content: $("#story_popup .content"),
      opened: false,
      current: 1,
      count: 11, // * TODO on story count change
      //story_range: [[13, 15], [20, 22], [30, 31]],
      meta: {},
      dev: function () { // * TODO if story popup structure change call this and grab copy/paste console output to input.html, generate all locales
        var html, i;
        for(i = 1; i <= this.count; ++i) {
          html += `
            <div class="story" data-id="${i}" data-i18n-stories-s${i}-yid="data-yid">
              <div class="title" data-i18n-stories-s${i}-title="text"></div>
              <div class="quote" data-i18n-stories-s${i}-quote="text"></div>
              <div class="name" data-i18n-stories-s${i}-name="text"></div>
              <div class="job" data-i18n-stories-s${i}-job="text"></div>
              <div class="job_start_date" data-i18n-stories-s${i}-job_start_date="text"></div>
              <div class="text-box"><div class="text" data-i18n-stories-s${i}-text></div></div>
            </div>`;
        }
        console.log(html);
      },
      close: function () {
        this.el.attr("data-current", "");
        this.el.find(".window").velocity({ opacity: 0 }, { duration: 500 });
        panorama.audio.softUnMute();
      },
      open: function (id) {
        this.el.attr("data-current", id);
        this.el.find(".window").velocity({ opacity: 1 }, { duration: 1000, easing: "easeInCirc" });
        panorama.audio.softMute();
        //global_callback = function() { this.close(); };
        // this.el.addClass("opened");
        this.resize();
      },
      resize: function () {
        var t = this;
        this.content.find(".story .text-box").css({ "height": ( t.el.find(".window").height() - t.el.find(".active .text-box").position().top - 20) + "px" });
        panorama.el.find("object").css("height", h - 60);
      },
      next: function () {
        var t = this,
          cur = t.current,
          nxt = (cur+1) > t.count ? 1 : (cur+1),
          fir = t.el.find("[data-id='" + cur + "']"),
          sec = t.el.find("[data-id='" + nxt + "']").addClass("second");
        t.go_to(nxt);
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
        t.go_to(prv);
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
      },
      go_to: function (id) {
        params.write(this.name_by_id(id))
        // console.log("go_to");
        var st = $("#story" + 6), box = st.get(0).getBBox(), pnl = st.closest(".apanel").attr("data-panel"),
        tmp_w = 0;
        for(var i = 0; i < pnl - 1; ++i) {
          tmp_w += panorama.panels.w[i];
          // console.log(i, panorama.panels.w[i]);
        }
        // console.log(box.x, panorama.offset.left);
        panorama_scroll_by_pos(-1*(tmp_w+box.x+panorama.offset.left-w/2-box.width/2));
        // console.log("go to story by id", id, box, pnl);
      },
      by_name: function (name) {
        var id;
        js.story_titles.forEach(function (st, st_i) {
          if(st[0] === name || st[1] === name || st[2] === name) {
            id = st_i + 1;
          }
        });
        if(typeof id !== "undefined") {
          // console.log("by_name story", id);
          this.open(id);
        }
        // console.log(name, js.story_titles);
      },
      name_by_id: function (id) {
        return js.story_titles[id-1][["en", "ka", "ru"].indexOf(lang)];
      },
    },
    // resourceLoaded: false,
    keyboardOn = true,
    nav_menu = $(".nav-menu"),
    tooltip = {
      template: undefined,
      init: function () {
        this.template = $(".tooltip-template").html();
      },
      text_by_story: function (id) {
        var st, mt;
        if(!story.meta.hasOwnProperty(id)) {
          console.log("here tooltip");
          st = story.el.find(".story[data-id='" + id + "']");
          story.meta[id] = {
            title: st.find(".title").text(),
            quote: st.find(".quote").text(),
            name: st.find(".name").text(),
            job: st.find(".job").text(),
            job_start_date: st.find(".title").text()
          };
        }
        mt = story.meta[id];
        return this.template
          .replace("{{title}}", mt.title)
          .replace("{{quote}}", mt.quote)
          .replace("{{name}}", mt.name)
          .replace("{{job}}", mt.job)
          .replace("{{job_start_date}}", mt.job_start_date);
      }
    },
    params = {
      permit: ["story"],
      trigger: {
        story: function (v) { story.by_name(v); }
      },
      read: function () {
        var query = window.location.search.substring(1),
          vars = query.split("&"), i, tmp, kv;

        for (i=0;i<vars.length;i++) {
          kv = vars[i].split("=");
          if(kv.length==2 && this.permit.indexOf(kv[0]) !== -1) {
            tmp = isNumber(kv[1]) ? +kv[1] : (kv[1]!="" ? kv[1] : undefined );
            if(typeof tmp !== "undefined") {
              params[kv[0]] = tmp;
              if(this.trigger.hasOwnProperty(kv[0])) { this.trigger[kv[0]](tmp); }
            }
          }
        }
        console.log(params);
      },
      write: function (story_name) {
        window.history.pushState({ story: story_name }, null, window.location.pathname + "?story=" + story_name);
        // change share things
        // t.download.attr("href", window.location.pathname + "?filter=donation&" + (params.length ? (params.join("&") + "&") : "") + "format=csv")
      }
    };


  function global_callback_function () {
    if(typeof global_callback === "function") {
      global_callback();
      global_callback = undefined;
    }
  }

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
  var panorama_scroll_by_pos;
  function bind () {

    $(window).resize(function () { resize(); });

    // panorama.surface.click(function () {
    //   story.open(1);
    // });

    panorama_scroll_by_pos = function panorama_scroll_by_pos (pos) {
      if(pos <= -1 * panorama.offset.right || pos >= w - panorama.offset.left) {
        flip(pos);
      }
      else {
        prev = panorama.container_position;
        panorama.container_position = pos;
        panorama.container.velocity({ translateX : [pos, prev]}, { duration: 500, easing: "linear" });
      }
      analyze_position(pos);
    }
    function panorama_scroll (direction) {
      var pos = panorama.container_position + -1*direction*panorama.step;

      if(pos <= -1 * panorama.offset.right || pos >= w - panorama.offset.left) {
        flip(pos);
      }
      else {
        panorama.container_position = pos;
        panorama.container.velocity({ translateX : pos}, { duration: 500, easing: "linear" });
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
        if(keycode === Key.ESC) {
          popup.close();
          global_callback_function();
        }
      }
    });
    addWheelListener(document, function (event) {
      if(event.deltaY !== -0 && event.deltaY !== 0) {
        event.deltaY <= -0 ? panorama_scroll_left() : panorama_scroll_right();
      }
    });

    // $(document).on("wheel", function (event) {
    //   console.log("scroll", event.deltaY > 0);
    //
    // });
    $(document).on("click", function (event) { global_callback_function(); });

    $(".nav-menu-toggle").on("click", function () {
      var tmp = nav_menu.attr("data-menu");
      nav_menu.attr("data-menu", tmp === "main" ? "" : "main");
      $(this).toggleClass("active");
    });
    $(".nav-sub-menu-toggle").on("click", function () {
      var tmp = nav_menu.attr("data-menu"),
        t = $(this), p = t.parent(), // tmp2 = nav_menu.attr("data-desktop-menu"),
        is_active = p.hasClass("active");

      nav_menu.find(".nav-menu-container > li.active").removeClass("active");
      p.toggleClass("active", !is_active);

      nav_menu.attr("data-menu", tmp === "main" ? "sub" : "main" );


      //nav_menu.attr("data-desktop-menu", is_active ? "" : "sub");

      //global_callback = function() { nav_menu.find(".nav-menu-container > li.active").removeClass("active"); };

    });
    $(".nav-sub-menu-back").on("click", function () {
      nav_menu.attr("data-menu", "main");
      $(this).parent().parent().parent().removeClass("active");
    });
    $(".sound-toggle").click(function () { panorama.audio.muteToggle(); });

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
    panorama.map.bind();
  }
  function finite () {

    var layer_anim = $(".layer-anim"),
      color = $(".layer-colored")
        .addClass("anim-object")
        .hover(function () {
          layer_anim.velocity("stop", true);
          color.velocity("stop", true);
          animator_js_hover();
        }, function () {
          layer_anim.velocity("stop", true);
          animator();
        })
        .click(function () {
          story.open(+$(this).attr("story-point"));
        });

    $.Velocity
      .RegisterEffect("js.shake", {
        defaultDuration: 100,
        easing: "linear",
        calls: [
          [ { translateX: "+=-1", rotateZ: "+=-2deg" } ],
          [ { translateX: "+=3" } ],
          [ { translateX: "+=-6" } ],
          [ { translateX: "+=8" } ],
          [ { translateX: "+=-8", rotateZ: "+=4deg" } ],
          [ { translateX: "+=8" } ],
          [ { translateX: "+=-8" } ],
          [ { translateX: "+=6" } ],
          [ { translateX: "+=-3" } ],
          [ { translateX: "+=1", rotateZ: "+=-2deg" } ]
        ],
        reset: { translateX: 0, rotateZ: 0}
      })
      .RegisterEffect("js.hover", {
        defaultDuration: 1000,
        easing: "linear",
        calls: [
          [ { translateX: "+=2", rotateZ: "+=2deg" } ],
          [ { translateX: "+=-4", rotateZ: "+=-4deg" } ],
          [ { translateX: "+=2", rotateZ: "+=2deg" } ]
        ],
        reset: { translateX: 0, rotateZ: 0}

      });
    function animator_js_hover () {
      layer_anim.velocity("js.hover", { delay: 100, complete: function () { animator_js_hover(); } });
    }
    function animator () {
      layer_anim.velocity("js.shake", { delay: 1000, complete: function () { animator(); } });
      color.velocity({ opacity: 1}, { delay: 900, duration: 500, reset: { opacity: 0 }}).velocity("reverse", { duration: 500 });
    }
    animator();


    $(".apanel .layer-colored").qtip({
      content: { text: function () { return tooltip.text_by_story(+$(this).attr("data-story")); }, title: false },
      position: {
        target: "mouse",
        // effect: false,
        viewport: $(window),
        my: 'bottom left',
        at: 'top right',
        adjust: {
          x: 30,
          y: -40,
          method: 'flipinvert flipinvert'
        }

      },
      style: {
         tip: { // Requires Tips plugin
            corner: true, // Use position.my by default
            width: 10,
            height: 10,
            border: true // Detect border from tooltip style
          }
        }
       // style: { tip: "ABC", corner: true},
       //  events: {
       //  hidden: function(event, api) {
       //    console.log(event,api);}
       //  }

    });

    redraw();
    bind();
    tooltip.init();
    params.read();
    I18n.remap(); // deploy remove this line
    lang = document.documentElement.lang;
    // console.log(params);

    console.log("finite");
  }
  function load_callback () {
    console.log("load_callback");
    loader.inc(8);

    var tmp, tmp_w = 0, tmp_i = 0, pnl, expect_cnt = 0, cnt = 0, svg;

    panorama.panels.elem.forEach(function (d){
      tmp = d.width();
      panorama.panels.w.push(tmp);
      panorama.width += tmp;
      d.replaceWith(d.get(0).contentDocument.documentElement.outerHTML);
    });
    panorama.story_width = panorama.width;

    var template_panel = "<div class='panel'></div>",
      template_object = "<object data-panel='%id' data-type='%type' type='image/svg+xml'></object>";

    // need count of additional panels for loader
    while(tmp_w < w) { // for right side
      ++expect_cnt;
      tmp_w += panorama.panels.w[tmp_i];
      tmp_i = ++tmp_i % panorama.panels.count;
    }
    tmp_w = 0, tmp_i = panorama.panels.count - 1;
    while(tmp_w < w) { // for left side
      ++expect_cnt;
      tmp_w += panorama.panels.w[tmp_i];
      if(--tmp_i === 0) tmp_i = panorama.panels.count - 1;
    }

    var percent_step = 10 / expect_cnt;

    tmp_w = 0, tmp_i = 0;
    while(tmp_w < w) {
      pnl = $(template_panel).appendTo(panorama.container);

      tmp = $(template_object.replace("%id", "r" + (tmp_i+1)).replace("%type", "bg"));
      tmp.one("load", function (event) { loader.inc(percent_step); if(++cnt === expect_cnt) { setTimeout(finite, 100); } });
      tmp.attr("data", (panorama.panels.path + "bg/" + panorama.panels.names[tmp_i] + ".svg"));
      pnl.append(tmp);

      pnl.append("<div class='surface'></div>");
      svg = $("<div class='apanel' data-panel='r" + (tmp_i+1) + "' data-type='fg'>").appendTo(pnl);

      tmp = $(template_object.replace("%id", "r" + (tmp_i+1)).replace("%type", "bg"));
      tmp.one("load", function (event) {
        $(this).replaceWith(this.contentDocument.documentElement.outerHTML);
        loader.inc(percent_step); if(++cnt === expect_cnt) { setTimeout(finite, 100); } });
      tmp.attr("data", (panorama.panels.path + "fg/" + panorama.panels.names[tmp_i] + ".svg"));
      svg.append(tmp);


      tmp_w += panorama.panels.w[tmp_i];
      tmp_i = ++tmp_i % panorama.panels.count;
    }
    panorama.right_width = tmp_w;
    panorama.width += tmp_w;


    tmp_w = 0, tmp_i = panorama.panels.count - 1;
    while(tmp_w < w) {

      pnl = $(template_panel).prependTo(panorama.container);

      tmp = $(template_object.replace("%id", "l" + (tmp_i+1)).replace("%type", "bg"));
      tmp.one("load", function (event) { loader.inc(percent_step); if(++cnt === expect_cnt) { setTimeout(finite, 100); } });
      tmp.attr("data", (panorama.panels.path + "bg/" + panorama.panels.names[tmp_i] + ".svg"));
      pnl.append(tmp);

      pnl.append("<div class='surface'></div>");
      svg = $("<div class='apanel' data-panel='l" + (tmp_i+1) + "' data-type='fg'>").appendTo(pnl);

      tmp = $(template_object.replace("%id", "l" + (tmp_i+1)).replace("%type", "fg"));
      tmp.one("load", function (event) {
        $(this).replaceWith(this.contentDocument.documentElement.outerHTML);
        loader.inc(percent_step); if(++cnt === expect_cnt) { setTimeout(finite, 100); } });
      tmp.attr("data", (panorama.panels.path + "fg/" + panorama.panels.names[tmp_i] + ".svg"));
      svg.append(tmp);


      tmp_w += panorama.panels.w[tmp_i];
      if(--tmp_i === 0) tmp_i = panorama.panels.count - 1;
    }
    panorama.left_width = tmp_w;
    panorama.width += tmp_w;

    panorama.offset.right = panorama.width - panorama.right_width;
    panorama.offset.left = panorama.left_width;


    for(var i = 0; i < panorama.panels.current - 1; ++i) {
      tmp_w += panorama.panels.w[i];
    }
    panorama.container_position = -1 * tmp_w;
    // console.log(panorama.container_position);
    panorama.container
      .css("transform", "translateX(" + (-1 * tmp_w) + "px)");



    panorama.el.find(".surface").draggable(
      {
        axis: "x",
        start:  function (event, ui) {
          //console.log("start", event, ui);
          panorama.surface = $(event.target);
        },
        drag: function (event, ui) {
          //console.log("drag", event, ui);
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
          //console.log("stop", event, ui);
          panorama.el.find(".surface").css("left", 0);
          panorama.surface_position = 0;
        }
      }
    );

    panorama.audio.play(0);
    panorama.audio.muteToggle();

    loader.inc(10);
  }

  function load_asset () {
    panorama.map.el.one("load", function (event){
            loader.inc(2);
            panorama.map.bind();
            //
            setTimeout(function () { load_callback(); }, 100);
          });
    panorama.map.el.attr("data", "../assets/images/storymap.svg");
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
      setTimeout(load_asset, 100);
    };
    // setTimeout(load_asset, 100);
  }
  function load_audio () {
    var cnt = 0, tmp,
      expect_cnt = panorama.audio.count,
      ext = panorama.audio.ext,
      path = panorama.audio.path;

    for(var i = 1; i <= expect_cnt; ++i) {
      panorama.audio.elem.push($("<audio>",
        {
          preload:"auto",
          loop: true,
          one: {
            canplay: function (event) { loader.inc(5); if(++cnt === expect_cnt) { setTimeout(load_youtube, 100); } },
            error: function (e) { console.log(this, e, "error in load audio for one of the file"); }
          },
          "src": (path + i + "." + ext)
        }).get(0));
    }
  }
  function load_panels () {
    var cnt = 0, bg, fg;
    panorama.panels.names.forEach( function (d, i) {
      bg = panorama.container.find("object[data-panel='" + (i+1) + "'][data-type='bg']");
      bg.one("load", function (event){ loader.inc(6); if(++cnt === panorama.panels.count*2) { setTimeout(load_audio, 100); } });
      bg.attr("data", panorama.panels.path + "bg/" + d + ".svg");


      fg = panorama.container.find(".apanel[data-panel='" + (i+1) + "'][data-type='fg'] object");
      panorama.panels.elem.push(fg);
      fg.one("load", function (event){ loader.inc(6); if(++cnt === panorama.panels.count*2) { setTimeout(load_audio, 100); } });
      fg.attr("data", panorama.panels.path + "fg/" + d + ".svg");
    });
  }


  // (function init () {
  //   panorama.init();
  //   resize();
  //   load_panels();
  // })();

  (function dev_init () {
    // ld = loader;
    panorama.init();
    // p = panorama;
    I18n.init(function (){
      resize();
      load_panels();
    });

  })();
  // (function deploy_init () {
  //   // panorama.audio.dev();
  //   // story.dev();
  //   I18n.init(function (){ I18n.remap(); });
  // })();


});
