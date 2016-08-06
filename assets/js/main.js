/*global  $ debounce I18n YT global_callback exist isNumber js getRandomIntInclusive device */
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
    lang = document.documentElement.lang || "en",
    global_callback = undefined,
    dummy = function (){},
    nowheel = false,
    panorama_scroll_by_pos,
    panorama = {
      step: 0,
      el: $("#panorama"),
      surface: undefined,
      container: $("#panorama .container"),
      surface_position: 0,
      container_position: 0,
      origin: 0,
      panels: {
        names: ["p1", "p2", "p3", "p4", "p5"], // * WARNING on panel count change plus need to add div object to layout
        w: [],
        elem: [],
        path: "../assets/images/panels/",
        count: 5, // * WARNING on panel count change
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
        default_volume: 0.6,
        fade_duration: 500,
        can_play: true,
        dev: function () { // * WARNING call panorama.audio.dev(); in current context
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
          var t = this;
          if(t.can_play) {
            if(typeof ind === "undefined") { ind = 0; }
            if(ind >= 0 && ind < t.count) {
              var snd = t.elem[ind];
              if(typeof snd !== "undefined" && snd.readyState == 4) {
                //console.log("audio play ", ind);
                t.stop(t.current);
                snd.volume = t.default_volume;
                snd.muted = t.muted || t.soft_muted;
                snd.play();
                t.current = ind;
              }
            }
          }
          else {
            setTimeout(function () { t.play(ind); }, 100);
          }
        },
        stop: function (ind) {
          var t = this;
          if(typeof ind === "undefined") { ind = t.current; }
          if(ind >= 0 && ind < t.count) {
            var snd = t.elem[ind];
            if(typeof snd !== "undefined" && snd.readyState == 4) {
              var step = t.default_volume/10, interval_id, dur = t.fade_duration/10;
              if(dur < 20) dur = 20;
              t.can_play = false;
              interval_id = setInterval(function () {
                var tmp = snd.volume - step;
                if(tmp <= 0) {
                  clearInterval(interval_id);
                  snd.muted = 0;
                  snd.pause();
                  t.can_play = true;
                }
                else {
                  snd.volume = tmp;
                }
              }, dur);
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
      }
    },
    map = {
      el: $(".nav-map-points"),
      points: $(".nav-map-points > div"),
      bind: function () {
        var t = this;
        t.points.click(function () {
          t.points.removeClass("active");
          story.go_to(+$(this).addClass("active").attr("data-id"), true);
        });
      },
      select_by_id: function (id) {
        var t = this;
        t.points.removeClass("active");
        t.el.find("[data-id='" + id + "']").addClass("active");
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
      completed: false,
      fade_duration: 0,//2000, // deploy change back this value
      fade_easing: "easeInOutCirc",
      before_close_duration: 0, //5000, // deploy change back this value
      first: false,
      aborted: false,
      inc: function (percent) {
        var t = this;
        if(t.completed) return;
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

        if(percent >= 100) { t.complete(); }
      },
      complete: function () {
        // console.log("completed");
        var t = this;

        setTimeout(function () {
          t.el.find(".loader-box").hide();
          t.el.fadeOut({ duration: t.fade_duration, easing: t.fade_easing, complete: function () { ready(); t.completed = true; t.first = true; t.progress = 0; } });
        }, t.before_close_duration);
      },
      abort: function () {
        this.aborted = true;
      },
      abort_complete: function () {
        var t = this;
        t.aborted = false;
        t.completed = true;
        t.progress = 0;
      }
    },
    story = {
      el: $("#story_popup"),
      // content: $("#story_popup .content"),
      content: $("#story_popup .content"),
      share: $(".share-story .addthis_sharing_toolbox"),
      opened: false,
      current: 1,
      count: 11, // * WARNING on story count change
      breath_direction: [1, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0], // left 0, right 1
      //story_range: [[13, 15], [20, 22], [30, 31]],
      meta: {},
      dev: function () { // * WARNING if story popup structure change call this and grab copy/paste console output to input.html, generate all locales
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
        nowheel = false;
        var t = this;
        t.toggle_youtube(t.current, false);
        t.el.find(".window").velocity({ opacity: 0 }, { duration: 500, complete: function () {
          t.el.attr("data-current", "");
          t.el.find(".content .story.active").removeClass("active");
        } });
        panorama.audio.softUnMute();
        t.on_animation();

      },
      before_open: function (id) {
        nowheel = true;
        var t = this;
        panorama.audio.softMute();
        t.off_animation();
        $(".qtip:visible").qtip("hide");
        map.select_by_id(id);
        t.content.find(".story .text-box").css({ "height": ( t.el.find(".window").height() - t.el.find(".active .text-box").position().top - 20) + "px" });
      },
      toggle_youtube: function (id, play) {
        if(typeof play === "undefined") { play = false; }
        var cnt = $("#story_popup .content .story[data-id='" + id + "']"),
          yid = cnt.attr("data-yid"),
          pl = undefined;
        if(typeof yid !== "undefined" && youtubePlayers.hasOwnProperty(yid)) {
          pl = youtubePlayers[yid];
          if(pl) {
            if(play && typeof pl.playVideo === "function") { pl.playVideo(); }
            else if(!play && typeof pl.pauseVideo === "function") { pl.pauseVideo(); }
          }
        }
      },
      open: function (id) {
        var t = this;
        t.el.attr("data-current", id);
        t.el.find(".content .story.active").removeClass("active");
        t.el.find(".content .story[data-id='" + id + "']").addClass("active");
        t.before_open(id);
        t.el.find(".window").velocity({ opacity: 1 }, { duration: 1000, easing: "easeInCirc", complete: function() {
          t.toggle_youtube(id, true);
        } });

        this.current = id;
        // play youtube from stop point
        //global_callback = function() { t.close(); };
        // t.el.addClass("opened");
        //t.resize();
      },
      resize: function () {
        panorama.el.find("object").css("height", h - 60);
      },
      next: function () {
        var t = this,
          cur = t.current,
          nxt = (cur+1) > t.count ? 1 : (cur+1),
          fir = t.el.find("[data-id='" + cur + "']"),
          sec = t.el.find("[data-id='" + nxt + "']").addClass("second");
        t.toggle_youtube(cur, false);
        t.toggle_youtube(nxt, true);
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
        t.toggle_youtube(cur, false);
        t.toggle_youtube(prv, true);
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
      go_to: function (id, shake) {
        params.write(this.name_by_id(id));
        var st = $("#story" + id),
          // box = st.get(0).getBBox(),
          pnl = +st.closest(".apanel").attr("data-panel"),
          tmp_w = 0;
        for(var i = 0; i < pnl - 1; ++i) {
          tmp_w += panorama.panels.w[i];
        }
        panorama_scroll_by_pos(-1*(tmp_w + st.position().left + panorama.offset.left - w/2 + st.width()/2));

        if(shake === true) {
          story.off_animation();
          $("#story" + id + " .layer-colored").velocity({ opacity: 1}, { delay: 300, duration: 1000, easing: "easeInOutCubic", reset: { opacity: 0.1 }});
          $("#story" + id + " .layer-anim").velocity("js.shake", { delay: 300, complete: function () { animator(); } });
        }
      },
      by_name: function (name) {
        var id;
        js.story_titles.forEach(function (st, st_i) {
          if(st[0] === name || st[1] === name || st[2] === name) {
            id = st_i + 1;
          }
        });
        if(typeof id !== "undefined") {
          this.go_to(id);
          this.open(id);
        }
        // console.log(name, js.story_titles);
      },
      name_by_id: function (id) {
        return js.story_titles[id-1][["en", "ka", "ru"].indexOf(lang)];
      },
      off_animation: function () {
        $(".layer-anim").velocity("finish");
        $(".layer-colored").velocity("finish");
      },
      on_animation: function () {
        animator();
      }

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
          st = story.el.find(".story[data-id='" + id + "']");
          story.meta[id] = {
            title: st.find(".title").text(),
            quote: st.find(".quote").text(),
            name: st.find(".name").text(),
            job: st.find(".job").text(),
            job_start_date: st.find(".job_start_date").text()
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
      },
      write: function (story_name) {
        var url = window.location.pathname + "?story=" + story_name;
        window.history.pushState({ story: story_name }, null, url);
        story.share.attr("data-url", url);
      }
    },
    load = {
      finite: function () { console.log("finite");
        if(loader.aborted) { loader.abort_complete(); return; }
        params.read();

        register_effects();

        tooltip.init();

        bind();

        loader.inc(2);
      },
      callback: function () { console.log("load.callback");
        if(loader.aborted) { loader.abort_complete(); return; }
        resize();

        var tmp, tmp_w = 0, tmp_i = 0, pnl, expect_cnt = 0, cnt = 0, svg, html = [];

        panorama.panels.elem.forEach(function (d, i){
          tmp = d.width();
          panorama.panels.w.push(tmp);
          panorama.width += tmp;
          html.push(d.get(0).contentDocument.documentElement.outerHTML);
          d.replaceWith(html[i]);
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

        var percent_step = 4 / (expect_cnt*2);

        tmp_w = 0, tmp_i = 0;
        while(tmp_w < w) {
          pnl = $(template_panel).appendTo(panorama.container);

          tmp = $(template_object.replace("%id", "r" + (tmp_i+1)).replace("%type", "bg"));
          tmp.one("load", function (event) { loader.inc(percent_step); if(++cnt === expect_cnt) { setTimeout(load.finite, 100); } });
          tmp.attr("data", (panorama.panels.path + "bg/" + panorama.panels.names[tmp_i] + ".svg"));
          pnl.append(tmp);

          pnl.append("<div class='surface'></div>");
          svg = $("<div class='apanel noselect' data-panel='r" + (tmp_i+1) + "' data-type='fg'>").appendTo(pnl);

          tmp = $(template_object.replace("%id", "r" + (tmp_i+1)).replace("%type", "bg"));
          tmp.one("load", function (event) {
            $(this).replaceWith(html[tmp_i].replace(/id\=\"story/g, "id=\"story_r_"));
            loader.inc(percent_step); if(++cnt === expect_cnt) { setTimeout(load.finite, 100); } });
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
          svg = $("<div class='apanel noselect' data-panel='l" + (tmp_i+1) + "' data-type='fg'>").appendTo(pnl);

          tmp = $(template_object.replace("%id", "l" + (tmp_i+1)).replace("%type", "fg"));
          tmp.one("load", function (event) {
            $(this).replaceWith(html[tmp_i].replace(/id\=\"story/g, "id=\"story_l_"));
            loader.inc(percent_step); if(++cnt === expect_cnt) { setTimeout(finite, 100); } });
          tmp.attr("data", (panorama.panels.path + "fg/" + panorama.panels.names[tmp_i] + ".svg"));
          svg.append(tmp);


          tmp_w += panorama.panels.w[tmp_i];
          if(--tmp_i === 0) tmp_i = panorama.panels.count - 1;
        }
        panorama.left_width = tmp_w;
        panorama.width += tmp_w;
        if(expect_cnt === 0) { setTimeout(finite, 100); }

        panorama.offset.right = panorama.width - panorama.right_width;
        panorama.offset.left = panorama.left_width;


        for(var i = 0; i < panorama.panels.current - 1; ++i) {
          tmp_w += panorama.panels.w[i];
        }
        panorama.container_position = -1 * tmp_w;
        // console.log(panorama.container_position);
        panorama.container
          .css("transform", "translateX(" + (-1 * tmp_w) + "px)");
      },
      youtube: function () {
        if(loader.aborted) { loader.abort_complete(); return; }
        var tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = function () {

          $("#story_popup .story .youtube[data-yid]").each(function (d, i) {
            var id = this.id, yid = this.dataset.yid;
            youtubePlayers[yid] = new YT.Player(
              id,
              {
                videoId: yid,
                height: device.mobile() ? "auto" : "600",
                width: "100%",
                playerVars:{ showinfo: 0, loop: 1, autoplay: 0, rel: 0 }
              }
            );
          });
          loader.inc(2);
          setTimeout(load.callback, 100);
        };
      },
      audio: function () {
        if(loader.aborted) { loader.abort_complete(); return; }
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
                canplay: function (event) { loader.inc(2); if(++cnt === expect_cnt) { setTimeout(load.youtube, 100); } },
                error: function (e) { console.log(this, e, "error in load audio for one of the file"); }
              },
              "src": (path + i + "." + ext)
            }).get(0));
        }
      },
      panels: function () {
        if(loader.aborted) { loader.abort_complete(); return; }
        var cnt = 0, bg, fg, pnl, templ =
          "<div class=\"panel\">\
            <object data-panel=\"%id\" data-type=\"bg\" type=\"image/svg+xml\"></object>\
            <div class=\"surface\"></div>\
            <div class=\"apanel noselect\" data-panel=\"%id\" data-type=\"fg\">\
              <object  type=\"image/svg+xml\"></object>\
            </div>\
          </div>";
        panorama.container.remove(".panel");
        panorama.panels.elem = [];
        panorama.panels.names.forEach( function (d, i) {
          pnl = $(templ.replace(/%id/g, i)).appendTo(panorama.container);
          bg = pnl.find("object[data-type='bg']");
          bg.one("load", function (event){ loader.inc(6); if(++cnt === panorama.panels.count*2) { setTimeout(load.audio, 100); } });
          bg.attr("data", panorama.panels.path + "bg/" + d + ".svg");

          fg = pnl.find(".apanel[data-type='fg'] object");
          panorama.panels.elem.push(fg);
          fg.one("load", function (event){ loader.inc(6); if(++cnt === panorama.panels.count*2) { setTimeout(load.audio, 100); } });
          fg.attr("data", panorama.panels.path + "fg/" + d + ".svg");
        });
      },
      all: function () {
        $(window).resize(function () { redraw(); });
        this.panels();
      }
    };


  var afinished = false;
  var after_hover_count = 1,
    animator_id = undefined,
    hover_animator_id = undefined;

  // function global_callback_function () {
  //   if(typeof global_callback === "function") {
  //     global_callback();
  //     global_callback = undefined;
  //   }
  // }

  function analyze_position (pos) {
    var normalized_pos = -1*((pos + panorama.left_width) % panorama.story_width), percent;
    if(normalized_pos < 0) { normalized_pos = panorama.story_width + normalized_pos; }
    normalized_pos += panorama.origin;
    percent = normalized_pos * 100 / panorama.story_width;
    panorama.audio.play_range.forEach(function (d, i) {
      if(percent >= d[0] && percent < d[1]) {
        if(i !== panorama.audio.current) {
          panorama.audio.play(i);
        }
      }
    });
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
          // panorama.el.find(".surface").css("left", 0);
          panorama.surface.css("left", 0);
          panorama.surface_position = 0;
        }
      }
    );

    var layer_anim = $(".layer-anim"),
      color = $(".layer-colored")
        .addClass("anim-object")
        .hover(function () {
          console.log("hover in");
          var t = $(this), p = t.parent();
          afinished = true;
          if(typeof animator_id !== "undefined") { clearTimeout(animator_id); }
          layer_anim.velocity("finish");
          color.velocity("finish");
          // animator_js_hover(+t.attr("data-story"));

          //layer_anim.velocity("stop", true);
          //layer_anim.removeClass("origin-center origin-bottom");
          //color.velocity("stop", true);

        }, hover_out_callback )
        .click(function () {
          story.open(+$(this).attr("data-story"));
        });


    $(".apanel .layer-colored").qtip({
      content: { text: function () { return tooltip.text_by_story(+$(this).attr("data-story")); }, title: false },
      position: {
        target: "mouse",
        // effect: false,
        viewport: $(window),
        my: "bottom left",
        at: "top right",
        adjust: {
          x: 30,
          y: -40,
          method: "flipinvert flipinvert"
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
    });



    // panorama.surface.click(function () {
    //   story.open(1);
    // });

    panorama_scroll_by_pos = function panorama_scroll_by_pos (pos) {
      if(pos <= -1 * panorama.offset.right || pos >= w - panorama.offset.left) {
        flip(pos);
      }
      else {
        var prev = panorama.container_position;
        panorama.container_position = pos;
        panorama.container.velocity({ translateX : [pos, prev]}, { duration: 500, easing: "linear" });
      }
      analyze_position(pos);
    };
    ld = panorama_scroll_by_pos;

    function panorama_scroll (direction) {
      panorama_scroll_by_pos(panorama.container_position + -1*direction*panorama.step);
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
          //global_callback_function();
        }
      }
    });

    addWheelListener(document, function (event) {
      if(!nowheel && event.deltaY !== -0 && event.deltaY !== 0) {
        event.deltaY <= -0 ? panorama_scroll_left() : panorama_scroll_right();
      }
    });

    // $(document).on("wheel", function (event) {
    //   console.log("scroll", event.deltaY > 0);
    //
    // });
    //$(document).on("click", function (event) { global_callback_function(); });
    $(document).on("click", ".nav-menu-toggle", function () {
      var tmp = nav_menu.attr("data-menu");
      nav_menu.attr("data-menu", tmp === "main" ? "" : "main");
      $(this).toggleClass("active");
    });

    $(document).on("click", ".nav-sub-menu-toggle", function () {
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
    map.bind();

  }



  function animator_js_hover (id) {
    console.log("animator_js_hover");
    if(after_hover_count !== 1) {
      hover_animator_id = setTimeout(function () { animator_js_hover(id); }, 100);
    }
    else {
      $("#story" + id + " .layer-anim").velocity("js.hover", { delay: 100, complete: function () { animator_js_hover(id); } });
    }
  }

  function animator () {
    if(afinished) return;
    //console.log("animator", after_hover_count);
    if(after_hover_count !== 1) {
      animator_id = setTimeout(function () { animator(); }, 100);
      return;
    }
    //console.log("animator inside");
    var layer_anim = $(".layer-anim"), ln = layer_anim.length;
    after_hover_count = 0;
    layer_anim.each(function (d) {
      ++after_hover_count;
      // console.log("plus one", after_hover_count);
      var t = $(this), stid = +t.find("[data-story]").attr("data-story"), dir = story.breath_direction[stid-1] === 0 ? "left" : "right";
      t.velocity("js.breath_" + dir, { delay: 1000, complete: (d === ln - 1 ? function () {/*console.log("animator end");*/ animator();} : function () { /*console.log("minus one", d , after_hover_count-1);*/ --after_hover_count; }) });
    });
    $(".layer-colored").velocity("js.fade", { delay: 900 });
  }

  var hover_out_callback = debounce(function () {
    console.log("hover out");
    // if(typeof hover_animator_id !== "undefined") { clearTimeout(hover_animator_id); }
    // $(".layer-anim").velocity("finish");
    afinished = false;
    animator();
  }, 100);

  function ready () {
    animator();
      panorama.audio.play(0);
    panorama.audio.muteToggle();
  }

  function register_effects () {
    $.Velocity
      .RegisterEffect("js.shake", {
        defaultDuration: 200,
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
        reset: { translateX: 0, rotateZ: 0 }
      })
      .RegisterEffect("js.breath_left", { // breath for left looking person
        defaultDuration: 6000,
        easing: "linear",
        calls: [
          [ { scale: "+=0.020", rotateZ: "+=2deg" }, .55 ],
          [ { scale: "+=-0.020", rotateZ: "+=-2deg" }, .45 ]
        ],
        reset: { rotateZ: "0deg", scale: 1 }
      })
      .RegisterEffect("js.breath_right", { // breath for right looking person
        defaultDuration: 6000,
        easing: "linear",
        calls: [
          [ { scale: "+=0.020", rotateZ: "+=-2deg" }, .55 ],
          [ { scale: "+=-0.020", rotateZ: "+=2deg" }, .45 ]
        ],
        reset: { rotateZ: "0deg", scale: 1 }
      })
      .RegisterEffect("js.hover", {
        defaultDuration: 1500,
        easing: "linear",
        calls: [
          [ { translateX: "+=2", rotateZ: "+=-1.5deg" } ],
          [ { translateX: "+=-4", rotateZ: "+=3deg" } ],
          [ { translateX: "+=4", rotateZ: "+=-3deg" } ],
          [ { translateX: "+=-4", rotateZ: "+=3deg" } ],
          [ { translateX: "+=2", rotateZ: "+=-1deg" } ]
        ],
        reset: { translateX: 0, rotateZ: "0deg"}

      })
      .RegisterEffect("js.swing", {
        defaultDuration: 500,
        easing: "linear",
        calls: [
          [ { rotateZ: [0, 360] } ]
        ],
        reset: { rotateZ: 0}

      })
      .RegisterEffect("js.fade", {
        defaultDuration: 6000,
        easing: "easeInOutCubic",
        calls: [
          [ { opacity: 1 }, .6 ],
          [ { opacity: .1 }, .4 ]
        ],
        reset: { opacity: .1 }
      });
  }



  function redraw () { console.log("redraw");
    if(loader.completed) {
      if(loader.first) { load.partial(); }
      else { load.all(); }
    }
    else {
      loader.abort();
      setTimeout(redraw, 100);
    }
  }

  function resize () { console.log("resize");
    w = $(window).width();
    h = $(window).height();
    panorama.step = w/5;
    panorama.origin = w/2;
    story.resize();
  }

  // for deployed version
  // (function init () {
  //   resize();
  //   load.panels();
  // })();

  // for dev version
  (function dev_init () {

    // p = panorama;
    I18n.init(function (){
      I18n.remap();
      load.all();
    });

  })();

  // for deploing process
  // (function deploy_init () {
  //   // panorama.audio.dev();
  //   // story.dev();
  //   I18n.init(function (){ I18n.remap(); });
  // })();
});
