/*global  $ debounce I18n YT exist isNumber js getRandomIntInclusive device addWheelListener Scale transformX isMacintosh */
/*eslint camelcase: 0, no-underscore-dangle: 0, no-unused-vars: 0, no-console: 0*/
var youtubePlayers = {}, loaderReady = false;
$(document).ready(function () {
  var w, h,
    Key = {
      ESC: 27,
      LEFT:   37,
      UP:     38,
      RIGHT:  39,
      DOWN:   40
    },
    timestamp = "?v=1474315200000",
    is_desktop = undefined,
    is_mobile = undefined,
    is_mac = undefined,
    is_ios = undefined,
    lang = document.documentElement.lang || "en",
    story_mode = false,
    popup_mode = false,
    on_esc = {},
    fake = function () {},
    fox = /firefox/i.test(navigator.userAgent),
    redraw_in_use = false,
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
        bg_elem: [],
        path: "../assets/images/panels/",
        count: 5, // * WARNING on panel count change
        current: 3,
        svg: [],
        bg_svg: [],
        init_w: [2218, 1786, 2968, 2795, 2476]
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
        ext: (/opera/i.test(navigator.userAgent) || fox ? "ogg" : "mp3"),
        path: "../assets/sounds/",
        // names of the files are number between 1 and 'count'
        elem: [],
        play_range: [ [0, 6.8], [6.8, 9.9], [9.9, 13.2], [13.2, 18.1], [18.1, 24.9], [24.9, 32.4], [32.4, 35.8], [35.8, 45.8], [45.8, 51.4], [51.4, 57], [57, 62.3], [62.3, 67.4], [67.4, 77.2], [77.2, 81.5], [81.5, 93.5], [93.5, 100] ], // range in percents where specific based on index audio should play
        count: 16,
        current: -1,
        muted: false,
        soft_muted: false,
        toggle: $(".sound-toggle"),
        default_volume: 0.6, // deploy 0.6
        fade_duration: 500,
        can_play: true,
        ready: undefined,
        next: -1,
        timeout_id: undefined,
        init: function () {
          var t = this;
          t.elem.forEach(function (d, i) {
            if(typeof d !== "undefined" && d.readyState > 0) {
              d.play();
              d.pause();
              d.currentTime = 0;
            }
          });
          t.ready = true;
          t.play(t.current);
        },
        // dev: function () { // * WARNING call panorama.audio.dev(); in current context
        //   // if need recalculate when audio should play, no pause in between, paste output in play_range
        //   var a = [560, 250, 270, 402, 556, 615, 275, 820, 460, 462, 434, 416, 800, 356, 986, 530], // pixels for each audio file to play starting from 0
        //     s = 8192, // sum is 8192 calculated based on width of new scan png file
        //     c = [], f = 0, tmp;
        //   if(this.count !== a.length) {
        //     console.log("Audio files count should be same as length of 'a' array.");
        //     return;
        //   }
        //   a.forEach(function (d) {
        //     tmp = Math.round10(d*100/s, -1);
        //     c.push([f, Math.round10(f+tmp, -1)]);
        //     f=Math.round10(f+tmp, -1);
        //   });
        //   tmp = "";
        //   c.forEach(function (d){ tmp += "[" + d[0] + ", " + d[1] +"], "; });
        //   console.log("[ " + tmp.substring(0, tmp.length - 2) + " ]" );
        // },
        volume: function (v) {
          if(v >= 0 && v <= 1) {
            this.elem.forEach(function (el) {
              el.volume = v;
            });
          }
        },
        play: function (ind) {
          var t = this, snd;
          if(typeof ind === "undefined") { ind = t.current; }
          if(!(ind >= 0 && ind < t.count)) { return; }
          t.next = ind;
          if(!t.ready) { t.current = ind; return; }
          if(t.can_play) {
            if(ind !== t.current) { t.stop(t.current, true); }
            else { t.actual_play(); }
          }
        },
        actual_play: function () {
          var t = this, snd = t.elem[t.next], st;
          if(typeof snd !== "undefined" && snd.readyState > 0 && snd.paused) {
            st = t.muted || t.soft_muted;
            if(!(is_ios && st)) {
              snd.volume = t.default_volume;
              snd.muted = st;
              snd.play();
            }
            t.current = t.next;
          }
        },
        stop: function (ind, play_after) {
          var t = this, f = false, snd, has_params = typeof ind !== "undefined";
          if(has_params || !(ind >= 0 && ind < t.count)) { ind = t.current; }
          if(ind !== -1) {
            t.can_play = false;

            snd = t.elem[ind];

            if(typeof snd !== "undefined" && snd.readyState > 0) {
              f = true;
              if(has_params && !is_ios) {
                var step = t.default_volume/10, interval_id, dur = t.fade_duration/10;
                if(dur < 20) { dur = 20; }

                interval_id = setInterval(function () {
                  var tmp = snd.volume - step;
                  if(tmp <= 0) {
                    clearInterval(interval_id);
                    snd.muted = 0;
                    snd.pause();
                    if(play_after === true) { t.actual_play.call(t); }
                    t.can_play = true;
                  }
                  else {
                    snd.volume = tmp;
                  }
                }, dur);
              }
              else {
                snd.muted = 0;
                // console.log("stopping", ind);
                snd.pause();
                if(play_after === true) { t.actual_play.call(t); }
                t.can_play = true;
              }
            }
          }
          if(!f) { t.can_play = true; if(play_after === true) { t.actual_play.call(t); } } // console.log("Unexpected Behaviour: Audio index is out of range or audio object is not ready"); }
        },
        toggle_mute: function (state) {
          if(this.current >= 1 && this.current <= this.count) {
            if(is_ios) {
              state ? this.elem[this.current].pause() : this.elem[this.current].play();
            }
            else {
              this.elem[this.current].muted = state;
            }
          }
        },
        mute: function () {
          this.muted = true;
          this.toggle_mute(true);
          this.toggle.addClass("muted");
        },
        unmute: function () {
          this.muted = false;
          this.toggle_mute(false);
          this.toggle.removeClass("muted");
        },
        softMute: function () {
          this.soft_muted = true;
          this.toggle_mute(true);
        },
        softUnMute: function () {
          this.soft_muted = false;
          if(!this.muted) {
            this.toggle_mute(false);
          }
        },
        muteToggle: function () {
          this.muted ? this.unmute() : this.mute();
        },
        bind: function () {
          var t = this;
          t.toggle.click(function () { t.muteToggle(); });
        }
      },
      position: {
        analyze: function (pos, sync_minimap) {
          if(typeof sync_minimap !== "boolean") { sync_minimap = true; }
          var normalized_pos = -1*((pos + panorama.left_width) % panorama.story_width), percent, best_i = -2, best_w = 99999999999;
          if(normalized_pos < 0) { normalized_pos = panorama.story_width + normalized_pos; }
          normalized_pos += panorama.origin;
          percent = normalized_pos * 100 / panorama.story_width;
          panorama.audio.play_range.forEach(function (d, i) {
            if(percent >= d[0] && percent < d[1]) {
              panorama.audio.play(i);
              return;
            }
          });
          if(sync_minimap) { minimap.sync(); }
        },
        flip: function (pos) {
          var tmp;
          if(pos <= -1 * panorama.offset.right) { //
            tmp = -1 * panorama.offset.left - (-1*pos - panorama.offset.right); // arrow right moving (left), happens when last panel goes out from left side of the screen, (-1*pos - panorama.offset.right) this is for extra pixels
            // console.log("flip to beggining", tmp);
            panorama.container_position = tmp;
            panorama.container.css(transformX(tmp));
          }
          else if(pos >= w - panorama.offset.left) {
            tmp = -1 * (panorama.offset.right - w - (pos - (w-panorama.offset.left))); // arrow left moving (right), happens when first panel goes out from right side of the screen, (pos - (w-panorama.offset.left)) this is for extra pixels
            // console.log("flip to the end", tmp);
            panorama.container_position = tmp;
            panorama.container.css(transformX(tmp));
          }
        }
      },
      animator: {
        finished: false,
        faders: undefined,
        anims: undefined,
        bind: function (first) {
          var tp = this;

          tp.faders = $(".fpanel svg");
          tp.anims = $(".layer-colored");
          // if(is_desktop) {
          tp.anims.hover(
            function () { tp.stop(); },
            debounce(function () { tp.start(); },
          100));
          // }
          // else {
          //   this.anims.css("opacity", 1);
          // }

          tp.anims.filter("[data-story]").click(function () { story.open(+$(this).attr("data-story")); });
        },
        play: function () {
          if(/*!is_desktop ||*/ this.finished) { return; }
          var tp = this;
          tp.faders.velocity("js.fade", { delay: 900, complete: function () { tp.play(); } });
        },
        start: function () {
          this.finished = false;
          if(this.faders.length) { // Unexpected behaviour found: sometimes faders is empty and it raise app stop
            this.faders.css("opacity", .1);
          }
          this.anims.css("opacity", 1);
          this.play();
        },
        stop: function () {
          this.finished = true;
          this.faders.velocity("stop", true).css("opacity", 1);
          this.anims.css("opacity", .1);
        }
      },
      scroll_by_pos: function (pos) {
        var t = this, prev = t.container_position;

        t.container_position = pos;
        t.container.velocity({ translateX : [pos, prev]}, { duration: 300, easing: "linear",
          complete: function () {
            if(pos <= -1 * t.offset.right || pos >= w - t.offset.left) {
              t.position.flip(pos);
            }
          }
        });

        t.position.analyze(pos);
      },
      scroll_by_pos_direct: function (pos) {
        var t = this, prev = t.container_position;

        t.container_position = pos;
        t.container.css(transformX(pos));
        if(pos <= -1 * t.offset.right || pos >= w - t.offset.left) {
          t.position.flip(pos);
        }
        t.position.analyze(pos, false);
      },
      scroll: function (direction) { /*console.log("panorama_scroll");*/
        var t = this;
        // console.log(t.container_position + -1*direction*t.step);
        t.scroll_by_pos(t.container_position + -1*direction*t.step);
      },
      bind: function (first) {
        var t = this;

        if(first) {
          t.audio.bind();

          var scrl_left = debounce(function () { helper.hide(); tooltip.hide(); t.scroll(-1); }, 100),
            scrl_right = debounce(function () { helper.hide(); tooltip.hide(); t.scroll(1); }, 100);

          $(document).keydown(function ( event ) {
            if (!event) {event = window.event;} // for IE compatible
            var keycode = event.keyCode || event.which; // also for cross-browser compatible
            if (keycode == Key.LEFT) { story_mode ? story.prev() : (popup_mode ? fake() : scrl_left()); }
            if (keycode == Key.RIGHT) { story_mode ? story.next() : (popup_mode ? fake() : scrl_right()); }

            if(keycode === Key.ESC) {
              Object.keys(on_esc).forEach(function (d) {
                if(typeof on_esc[d] === "function") {
                  on_esc[d]();
                }
              });
              helper.hide();
            }
          });

          addWheelListener(document, function (event) {
            if(!popup_mode && event.deltaY !== -0 && event.deltaY !== 0) {
              if(is_mac && Math.abs(event.deltaY) < 10) { return; }
              event.deltaY <= -0 ? scrl_left() : scrl_right();
            }
          });
        }

        t.animator.bind(first);

        var dragend = true,
          surfs = t.el.find((first ? "" : ".ghost ") + ".dpanel");
        if(fox) {
          surfs.on("mouseleave", function () { dragend = true; });
        }

        surfs.draggable(
          {
            axis: "x",
            start:  function (event, ui) {
              dragend = false;
              t.surface = $(event.target);
              if(first && !helper.hidden) { helper.hide(); }
            },
            drag: function (event, ui) {
              if(!fox || !dragend) {
                var pos = t.container_position + (ui.position.left - t.surface_position);
                t.surface_position = ui.position.left;

                if(pos <= -1 * t.offset.right || pos >= w - t.offset.left) {
                  t.position.flip(pos);
                }
                else {
                  t.container_position = pos;
                  t.container.css(transformX(pos));
                }
                t.position.analyze(pos);
              }
              else {
                return false;
              }
            },
            stop: function (event, ui) {
              t.surface.css("left", 0);
              t.surface_position = 0;
              dragend = true;
            }
          }
        );
      }
    },
    story = {
      el: $("#story_popup"),
      content: $("#story_popup .content"),
      share: $(".share-story .addthis_sharing_toolbox"),
      current: 5,
      count: 10, // * WARNING on story count change
      meta: {},
      by_url: false,
      max_width: 992,
      // dev: function () { // * WARNING if story popup structure change call this and grab copy/paste console output to input.html, generate all locales
      //   var html, i;
      //   for(i = 1; i <= this.count; ++i) {
      //     html += `
      //       <div class="story" data-id="${i}" data-i18n-stories-s${i}-yid="data-yid">
      //         <div class="title" data-i18n-stories-s${i}-title="text"></div>
      //         <div class="scroll-box">
      //           <div class="youtube" data-i18n-stories-s${i}-yid="data-yid" data-i18n-stories-s${i}-player_yid="id"></div>
      //           <div class="r">
      //             <div class="c meta-info">
      //               <div class="name"><span class="b" data-i18n-label-name></span><span data-i18n-stories-s${i}-name></span></div>
      //               <div class="job"><span class="b" data-i18n-label-job></span><span data-i18n-stories-s${i}-job></span></div>
      //               <div class="job_start_date" ><span class="b" data-i18n-label-job_start_date></span><span data-i18n-stories-s${i}-job_start_date="text"></span></div>
      //             </div>
      //             <div class="c meta-quote">
      //               <div class="quote" data-i18n-stories-s${i}-quote="text"></div>
      //             </div>
      //           </div>
      //         </div>
      //       </div>`;
      //   }

      //   console.log(html);
      // },
      // dev_story_thumbnail: function () { // * WARNING if about thumbnail list structure change call this and grab copy/paste console output to input.html, generate all locales, behind link should be generated by hand put at the end
      //   var html, i;
      //   [8, 2, 6, 5, 4, 9, 3, 7, 10, 1].forEach(function(d) {
      //     html += `
      //       <a href="#" class="to-character" data-id="${i}"><img src="../assets/images/thumbnails/${i}.jpg?v=1474315200000"><div class="thumbnail-overlay" data-i18n-stories-s${i}-quote="prefix[text]"><span data-i18n-stories-s${i}-title></span></div></a>`;
      //   });
      //   console.log(html);
      // },
      close: function () {
        story_mode = false;
        popup_mode = false;
        params.write();
        var t = this;
        t.toggle_youtube(t.current, false);
        t.el.find(".window").velocity({ opacity: 0 }, { duration: 500, complete: function () {
          t.el.attr("data-current", "");
          t.el.find(".content .story.active").removeClass("active");
        } });
        panorama.audio.softUnMute();
        t.on_animation();
        delete on_esc["story_to_close"];
      },
      before_open: function (id) {
        story_mode = true;
        popup_mode = true;
        var t = this;
        panorama.audio.softMute();
        t.off_animation();
        $(".qtip:visible").qtip("hide");
        t.update_height(t.content.find(".story.active"));
        on_esc["story_to_close"] = function () { t.close(); };
      },
      toggle_youtube: function (id, play) {
        if(typeof play === "undefined") { play = false; }
        var cnt = $("#story_popup .content .story[data-id='" + id + "']"),
          yid = cnt.attr("data-yid"),
          pl = undefined;
        if(typeof yid !== "undefined" && youtubePlayers.hasOwnProperty(yid)) {
          pl = youtubePlayers[yid];
          if(pl) {
            if(is_desktop && play && typeof pl.playVideo === "function") { pl.playVideo(); }
            else if(!play && typeof pl.pauseVideo === "function") { pl.pauseVideo(); }
          }
        }
      },
      open: function (id, cb) {
        var t = this;
        params.write(t.name_by_id(id));
        t.el.attr("data-current", id);
        t.el.find(".content .story.active").removeClass("active");
        t.el.find(".content .story[data-id='" + id + "']").addClass("active");
        t.before_open(id);
        t.el.find(".window").velocity({ opacity: 1 }, { duration: 1000, easing: "easeInCirc", complete: function () {
          t.toggle_youtube(id, true);
          if(typeof cb === "function") { cb(); }
        } });

        this.current = id;
      },
      next: function (no_url_update) {
        if(typeof no_url_update !== "boolean") { no_url_update = false; }
        var t = this,
          cur = t.current,
          nxt = (cur+1) > t.count ? 1 : (cur+1),
          fir = t.el.find("[data-id='" + cur + "']"),
          sec = t.el.find("[data-id='" + nxt + "']").addClass("second");
        t.toggle_youtube(cur, false);
        t.toggle_youtube(nxt, true);
        t.go_to(nxt);
        if(!no_url_update) { params.write(this.name_by_id(nxt)); }
        t.update_height(sec);
        t.content
          .one("webkitAnimationEnd oanimationend msAnimationEnd animationend", function (e) {
            t.content.removeClass("scroll-left animated");
            sec.addClass("active").removeClass("second");
            fir.removeClass("active");
          })
          .addClass("scroll-left animated");
        t.current = nxt;
      },
      prev: function (no_url_update) {
        if(typeof no_url_update !== "boolean") { no_url_update = false; }
        var t = this,
          cur = t.current,
          prv = (cur-1) > 0 ? (cur-1): t.count,
          fir = t.el.find("[data-id='" + cur + "']").addClass("second"),
          sec = t.el.find("[data-id='" + prv + "']").addClass("first");
        t.toggle_youtube(cur, false);
        t.toggle_youtube(prv, true);
        t.go_to(prv);
        if(!no_url_update) { params.write(this.name_by_id(prv)); }
        t.update_height(sec);
        t.content
          .addClass("scroll-right-origin")
          .one("webkitAnimationEnd oanimationend msAnimationEnd animationend", function (e) {
            t.content.removeClass("scroll-right-origin scroll-right animated");
            sec.addClass("active").removeClass("first");
            fir.removeClass("active second");
          })
          .addClass("scroll-right animated");
        t.current = prv;
      },
      bind: function (first) {
        var t = this, i, j, tmp, tmp_w, pnl, x1, x2, xm, xw, bbox;
        if(first) {
          t.el.find(".prev-toggle").click(function () { t.prev(); });
          t.el.find(".next-toggle").click(function () { t.next(); });
          t.el.find(".close, .bg").click(function () { t.close(); });
          if(!is_desktop) {
            var start_x, prev_y;
            t.el.find(".story .scroll-box").draggable({
              start:  function (event, ui) { start_x = event.clientX; prev_y = ui.position.top; },
              drag: function (event, ui) {
                var scroll;
                ui.position.left = 0;
                scroll = prev_y - ui.position.top;
                prev_y = ui.position.top;

                ui.position.top = 0;

                $(event.target).scrollTop(scroll + $(event.target).scrollTop());

              },
              stop: function (event) {
                if(Math.abs(event.clientX - start_x) > w/2) {
                  start_x > event.clientX ? t.next() : t.prev();
                }

              }
            });
          }
        }
      },
      go_to: function (id) {
        var st = $("#story" + id),
          pnl = +st.closest(".panel").attr("data-panel"),
          pbbox = panorama.container.get(0).getBoundingClientRect(),
          bbox = st.get(0).getBoundingClientRect();

        panorama.scroll_by_pos((pbbox.left - bbox.left) + w/2 - bbox.width/2);
      },
      go_to_prev: function () {
        var t = this, c = t.current,
          p = (c-1) > 0 ? (c-1): t.count;
        t.go_to(p);
        t.current = p;
      },
      go_to_next: function () {
        var t = this, c = t.current,
          n = (c+1) > t.count ? 1 : (c+1);
        t.go_to(n);
        t.current = n;
      },
      go_to_and_open_current: function () {
        var id = this.current;

        var st = $("#story" + id),
          pnl = +st.closest(".panel").attr("data-panel"),
          pbbox = panorama.container.get(0).getBoundingClientRect(),
          bbox = st.get(0).getBoundingClientRect();

        panorama.scroll_by_pos((pbbox.left - bbox.left) + w/2 - bbox.width/2);
        if(story.by_url) {
          helper.hidden = true;
          helper.el.hide();
          story.open(id, function () { loader.inc(); });
          story.by_url = false;
        }
        else {
          // helper.hide(8000);
          loader.inc();
        }
        story.on_animation();
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
      },
      current_by_name: function (name) {
        var id;
        js.story_titles.forEach(function (st, st_i) {
          if(st[0] === name || st[1] === name || st[2] === name) {
            id = st_i + 1;
          }
        });
        if(typeof id !== "undefined") {
          this.current = id;
        }
      },
      name_by_id: function (id) {
        return js.story_titles[id-1][["en", "ka", "ru"].indexOf(lang)];
      },
      off_animation: function () {
        panorama.animator.stop();
      },
      on_animation: function () {
        panorama.animator.start();
      },
      update_height: function (story_el) {
        var t = this, tmp,
          tmp_h = t.el.find(".window").height(),
          tmp_el = story_el.find(".scroll-box iframe"),
          cnt_w = t.el.find(".content").width(),
          title_h = story_el.find("> .title").outerHeight();

        tmp = tmp_h - title_h - (is_mobile ? 0 : 20);

        var tmp_w = tmp/9*16;
        var m_width = cnt_w > t.max_width ? t.max_width : cnt_w;
        while(tmp_w > m_width) {
          --tmp;
          tmp_w = tmp/9*16;
        }
        tmp_el.css({ "width": tmp_w + "px", "height": tmp + "px" });
        if(is_mobile) {
          tmp = tmp_h - title_h;
          story_el.find(".scroll-box").css({"height": tmp + "px"});
        }
      }
    },
    tooltip = {
      template: $(".tooltip-template").html(),
      text_by_story: function (id, type) {
        var st, mt, init_id = id;
        if(type === "gear") { id = "g" + id; }
        if(!story.meta.hasOwnProperty(id)) {
          if(type === "story") {
            st = story.el.find(".story[data-id='" + id + "']");
            story.meta[id] = {
              title: st.find(".title").text(),
              quote: st.find(".quote").text()//,
              // name: st.find(".name span:last-of-type").text(),
              // job: st.find(".job span:last-of-type").text(),
              // job_start_date: st.find(".job_start_date span:last-of-type").text()
            };
          }
          else {
            st = $(".gears [data-gear='" + init_id + "']");
            story.meta[id] = {
              title: st.attr("data-title"),
              quote: st.attr("data-quote")//,
              // name: st.find(".name span:last-of-type").text(),
              // job: st.find(".job span:last-of-type").text(),
              // job_start_date: st.find(".job_start_date span:last-of-type").text()
            };
          }

        }
        mt = story.meta[id];
        return this.template
          .replace("{{title}}", mt.title)
          .replace("{{quote}}", mt.quote);
          // .replace("{{name}}", mt.name)
          // .replace("{{job}}", mt.job)
          // .replace("{{job_start_date}}", mt.job_start_date);
      },
      bind: function (first) {
        $((first ? "" : ".ghost" ) + ".fpanel .layer-colored" + (is_mobile ? "[data-gear]" : "")).qtip({
          content: { text: function () {
            var tmp = $(this).attr("data-story") ? "story" : "gear";
            return tooltip.text_by_story(+$(this).attr("data-" + tmp), tmp); }, title: false },
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
      },
      hide: function () {
        $(".qtip:visible").qtip("hide");
      }
    },
    popup = {
      el: $("#popup"),
      content: $("#popup .content"),
      is_behind: false,
      close: function () {
        var t = this;
        popup_mode = false;
        t.el.attr("data-type", "");
        t.toggle_youtube(false);
        story.on_animation();
        panorama.audio.softUnMute();
        delete on_esc["popup_to_close"];
      },
      open: function (v) {
        var t = this;
        popup_mode = true;
        t.el.attr("data-type", v);
        t.is_behind = v === "behind";

        if(t.is_behind) { t.update_height(); }

        story.off_animation();
        panorama.audio.softMute();
        if(t.is_behind) { t.toggle_youtube(true); }
        on_esc["popup_to_close"] = function () { t.close(); };
      },
      bind: function () {
        var t = this;
        t.el.find(".close, .bg").on("click", function () { t.close(); });
        t.el.find(".about .to-character").click(function (e) {
          popup.close();
          story.by_name(story.name_by_id(+$(this).attr("data-id")));
          e.preventDefault();
        });
      },
      toggle_youtube: function (play) {
        var t = this;
        if(t.is_behind) {
          if(typeof play === "undefined") { play = false; }
          var cnt = $("#popup .behind .youtube"),
            yid = cnt.attr("data-yid"),
            pl = undefined;
          if(typeof yid !== "undefined" && youtubePlayers.hasOwnProperty(yid)) {
            pl = youtubePlayers[yid];
            if(pl) {
              if(play && typeof pl.playVideo === "function") { pl.playVideo(); }
              else if(!play && typeof pl.pauseVideo === "function") { pl.pauseVideo(); t.is_behind = false; }
            }
          }
        }
      },
      update_height: function () {
        var t = this, tmp, tmp_h = t.content.height(),
          tmp_el = t.content.find("iframe"),
          cnt_w = t.content.width(),
          title_h = t.content.find(".caption").outerHeight();
        t.content.scrollTop(0);//.css({ "height": (h > 760 ? h - 88 - 61 - 60 - 10 : h - 2*61) + "px" });

        tmp = tmp_h - 61 - (is_mobile ? 0 : 20);
        var tmp_w = tmp/9*16;
        var m_width = cnt_w > t.max_width ? t.max_width : cnt_w;
        while(tmp_w > m_width) {
          --tmp;
          tmp_w = tmp/9*16;
        }
        tmp_el.css({ "width": tmp_w + "px", "height": tmp + "px" });
      }
    },
    nav = {
      nv: $(".nav"),
      el: $(".nav-menu"),
      bind: function () {
        var tp = this;

        $(document).on("click", ".nav-prev", function () { story.go_to_prev(); });
        $(document).on("click", ".nav-next", function () { story.go_to_next(); });

        $(document).on("click", ".nav-menu-toggle", function () {
          var tmp = tp.el.attr("data-menu"), state = (tmp === "main" || tmp === "sub");
          tp.el.find(".nav-menu-container > li.active").removeClass("active");
          tp.el.attr("data-menu", (state ? "" : "main"));
          $(this).toggleClass("active", !state);
        });

        $(document).on("click", ".nav-sub-menu-toggle", function () {
          var tmp = tp.el.attr("data-menu"),
            t = $(this), p = t.parent(),
            is_active = p.hasClass("active");
          tp.el.find(".nav-menu-container > li.active").removeClass("active");
          p.toggleClass("active", !is_active);
          tp.el.attr("data-menu", tmp === "main" ? "sub" : "main" );
        });

        $(".nav-sub-menu-back").on("click", function () {
          tp.el.attr("data-menu", "main");
          $(this).parent().parent().parent().removeClass("active");
        });

        $("a[data-popup-target]").on("click", function () { popup.open($(this).attr("data-popup-target")); });
      }
    },
    minimap = {
      el: $(".minimap"),
      img: undefined,
      overlay: undefined,
      light: undefined,
      light_w: 0,
      lights: undefined,
      capes: undefined,
      cape_w: 0,
      img_w: 0,
      pos: 0,
      // cape: {
      //   left: 0,
      //   right: 0
      // },
      init: function () {
        var t = this;
        t.img = t.el.find("svg");

        t.img_w = t.img.width();

        t.overlay = t.el.find(".overlay");

        t.light_w = Math.ceil(w/panorama.story_width*t.img_w);
        if(t.light_w % 2) { ++t.light_w; }

        t.cape_w = t.img_w - t.light_w;

        t.light = t.overlay.find(".light_main");
        t.lights = t.overlay.find(".light").width(t.light_w);
        t.capes = t.overlay.find(".cape").width(t.img_w-t.light_w);

        t.pos = -1*(2*t.cape_w + t.light_w);
        t.overlay.css(transformX(t.pos));
      },
      bind: function () {
        var t = this, prev_x, cont;

        t.init();

        cont = $(t.img); //.get(0).contentDocument
        cont.find("image.to-character").click(function () {
          story.go_to(+$(this).attr("data-id"));

        });


        var dragend = true;
        if(fox) {
          t.lights.on("mouseleave", function () { dragend = true; });
        }

        t.lights.draggable(
          {
            axis: "x",
            start: function (event, ui) {
              dragend = false;
              prev_x = event.clientX;
            },
            drag: function (event, ui) {
              if(!fox || !dragend) {
                var diff = event.clientX - prev_x, start_pos;
                t.pos += diff;
                if(-1*t.pos > (2*t.cape_w + 2*t.light_w)) {
                  t.pos += (t.cape_w + t.light_w);
                }
                else if(-1*t.pos < t.cape_w) {
                  t.pos -= (t.cape_w + t.light_w);
                }

                start_pos = -1 * t.pos - 2 * t.cape_w - t.light_w;
                if(start_pos > 0) { start_pos = t.img_w - start_pos; }

                t.overlay.css(transformX(t.pos));

                panorama.scroll_by_pos_direct(-1 * (Math.abs(start_pos)/t.img_w * panorama.story_width + panorama.offset.left));

                prev_x = event.clientX;
              }
              else {
                return false;
              }
              ui.position.left = 0;
            },
            stop: function (event, ui) {
              dragend = true;
            }
          }
        );
      },
      sync: function () {
        var t = this, start_pos;
        start_pos = -1 * panorama.container_position - panorama.offset.left;
        t.pos = -1 * ( 2 * t.cape_w + t.light_w - start_pos / panorama.story_width * t.img_w);
        t.overlay.css(transformX(t.pos));
      }
    },
    params = {
      permit: ["story"],
      trigger: {
        story: function (v) { story.by_url = true; story.current_by_name(v); }
      },
      parse: function () {
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
        var url = window.location.pathname + (typeof story_name !== "undefined" ? "?story=" + story_name : "");
        window.history.pushState({ story: story_name }, null, url);
        story.share.attr("data-url", url);
      }
    },
    loader = {
      el: $("#loader"),
      image: $("#loader_image"),
      progress_label: $("#loader_progress span"),
      path: undefined,
      length: 2133,
      progress: 0,
      completed: false,
      fade_duration: 0,//2000, // deploy change back this value
      fade_easing: "easeInOutCirc",
      before_close_duration: 0, //3000, // deploy change back this value
      aborted: false,
      animate: true,
      animate_duration: 5000,
      current_tick_index: 0,
      scaler: undefined,
      stable_progress: 0,
      inc: function () { //percent
        var t = this, tmp;
        if(t.completed) return;
        tmp = Math.round(t.scaler(++t.current_tick_index));
        tmp = t.stable_progress + (isNaN(tmp) ? 1 : tmp) * 5;
        if(tmp > t.progress) {
          t.progress = tmp;
          t.progress_label.text(t.progress);
        }

        if(t.progress >= 100) { t.complete(); }
      },
      retick: function (allocated_ticks, allocated_steps) { // 100 percent was divided by 5 so 20 ticks, each loading peace recieved specific number that reflects amount of ticks for that task, first number is ticks, second amount of real loading peaces
        var t = this;
        t.stable_progress = t.progress;
        t.scaler = new Scale().domain(1, allocated_steps).range(1, allocated_ticks);
        t.current_tick_index = 0;
      },
      start_animation: function () {
        var t = this;
        if(!loaderReady) { setTimeout(function () { t.start_animation(); }, 100); return; }
        if(!t.path) {
          t.path = t.image.get(0).contentDocument.getElementsByTagName("path")[0];
          $(t.path).css("stroke-dasharray", t.length + "px");
          t.length = t.path.getTotalLength();
        }
        $(t.path).velocity({ "stroke-dashoffset": [-1*t.length, 0] },
          {
            duration: t.animate_duration,
            complete: function () {
              if(t.animate) { t.start_animation(); }
            }
          }
        );
      },
      complete: function () { /*console.log("loader.complete");*/
        var t = this;

        setTimeout(function () {
          t.animate = false;
          t.el.find(".loader-box").hide();
          t.el.fadeOut({ duration: t.fade_duration, easing: t.fade_easing, complete: function () { t.completed = true; t.progress = 0; } });
        }, t.before_close_duration);
      },
      abort: function () {
        // console.log("loader.abort");
        this.aborted = true;
      },
      abort_complete: function () {
        // console.log("loader.abort_complete");
        var t = this;
        t.aborted = false;
        t.completed = true;
        t.progress = 0;
      },
      restart: function () {
        // console.log("loader.restart");
        var t = this;
        $(t.path).css("stroke-dasharray", t.length + "px");
        t.progress = 0;
        t.completed = false;
        t.animate = true;
        loader.start_animation();
        t.el.show();
        t.el.find(".loader-box").show();
      }
    },
    helper = {
      el: $("#helper"),
      hidden: false,
      bind: function () {
        var t = this;
        if(is_mobile) {
          $(document).one("touchstart.waiting_gesture", t.interact.bind(t));
        }
        else if(is_desktop) {
          $(document).one("click.waiting_gesture", t.hide.bind(t));
        }
      },
      interact: function () {
        var t = this;
        if(is_mobile) {
          panorama.audio.init();
        }
        t.el.fadeOut(800);
      },
      hide: function (delay) {
        if(!this.hidden && is_desktop) {
          this.el.stop();
          typeof delay === "undefined" ? this.el.fadeOut(800) : this.el.delay(delay).fadeOut(1000);
        }
      }
    },
    load = {
      first_time: true,
      bind: function () { /*console.log("load.bind");*/
        if(loader.aborted) { loader.abort_complete(); return; }
        loader.retick(1, 1);
        panorama.bind(load.first_time);
        tooltip.bind(load.first_time);
        story.bind(load.first_time);
        if(load.first_time) {
          page.bind();
          nav.bind();
          minimap.bind();
          popup.bind();
          helper.bind();
          load.first_time = false;
        }
        story.go_to_and_open_current();
      },
      callback: function (is_partial) { /*console.log("load.callback");*/
        if(loader.aborted) { loader.abort_complete(); return; }

        resize();
        if(is_partial && popup_mode) {
          if(story_mode) { story.update_height(story.content.find(".story.active")); }
          else { popup.update_height(); }
        }
        var pnl_height = h - (w > 992 ? 120 : 60);
        panorama.el.find(".panel").css("height", pnl_height);
        var tmp, tmp_w = 0, tmp_i = 0, pnl, expect_cnt = 0, cnt = 0, svg, html = panorama.panels.svg,
          bg_html = panorama.panels.bg_svg;
        panorama.container.find(".panel.ghost").remove();
        panorama.panels.w = [];
        panorama.width = 0;

        panorama.panels.elem.forEach(function (d, i){
          tmp = Math.floor(pnl_height * panorama.panels.init_w[i] / 1000);
          panorama.el.find(".panel[data-panel='" + (i+1) + "']").css("width", tmp);
          panorama.panels.w.push(tmp);
          panorama.width += tmp;
        });
        panorama.story_width = panorama.width;

        var template_panel = "<div class='panel ghost' data-panel='%data-panel'><div class='bpanel'></div><div class='dpanel noselect'></div><div class='fpanel noselect'></div></div>";

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
        expect_cnt*=2;
        loader.retick(is_partial ? 19 : 5, expect_cnt === 0 ? 1 : expect_cnt);
        tmp_w = 0, tmp_i = 0;
        while(tmp_w < w) {
          pnl = $(template_panel.replace("%data-panel", ("r" + (tmp_i+1)))).appendTo(panorama.container);
          pnl.css({ height: pnl_height, width: panorama.panels.w[tmp_i] });

          pnl.find(".bpanel").html(bg_html[tmp_i]);
          loader.inc();
          if(++cnt === expect_cnt) { setTimeout(load.bind, 100); }

          pnl.find(".fpanel").html(html[tmp_i].replace(/id\=\"story/g, "id=\"story_r_"));
          loader.inc();
          if(++cnt === expect_cnt) { setTimeout(load.bind, 100); }

          tmp_w += panorama.panels.w[tmp_i];
          tmp_i = ++tmp_i % panorama.panels.count;
        }
        panorama.right_width = tmp_w;
        panorama.width += tmp_w;


        tmp_w = 0, tmp_i = panorama.panels.count - 1;
        while(tmp_w < w) {
          pnl = $(template_panel.replace("%data-panel", ("l" + (tmp_i+1)))).prependTo(panorama.container);
          pnl.css({ height: pnl_height, width: panorama.panels.w[tmp_i] });

          pnl.find(".bpanel").html(bg_html[tmp_i]);
          loader.inc();
          if(++cnt === expect_cnt) { setTimeout(load.bind, 100); }

          pnl.find(".fpanel").html(html[tmp_i].replace(/id\=\"story/g, "id=\"story_l_"));
          loader.inc();
          if(++cnt === expect_cnt) { setTimeout(load.bind, 100); }

          tmp_w += panorama.panels.w[tmp_i];
          if(--tmp_i === 0) tmp_i = panorama.panels.count - 1;
        }
        panorama.left_width = tmp_w;
        panorama.width += tmp_w;

        panorama.offset.right = panorama.width - panorama.right_width;
        panorama.offset.left = panorama.left_width;
        if(expect_cnt === 0) { loader.inc(); setTimeout(load.bind, 100); }
      },
      effects: function () { /*console.log("load.effects");*/
        $.Velocity
          .RegisterEffect("js.fade", {
            defaultDuration: 6000,
            easing: "easeInOutCubic",
            calls: [
              [ { opacity: 1 }, .6 ],
              [ { opacity: .1 }, .4 ]
            ],
            reset: { opacity: .1 }
          });
        setTimeout(load.callback, 100);
      },
      youtube: function () { /*console.log("load.youtube");*/

        loader.retick(1, 1);
        var tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = function () {

          story.el.find(".story .youtube[data-yid]").each(function (d, i) {
            var id = this.id, yid = this.dataset.yid, p = $(d).parent().find(".r");
            youtubePlayers[yid] = new YT.Player(
              id,
              {
                videoId: yid,
                width: "100%",
                playerVars:{ showinfo: 0, loop: 1, autoplay: 0, rel: 0, cc_load_policy: 1, hl: lang },
                events: {
                  onStateChange: function (event) {
                    if(is_mobile) { return; }
                    var dt = event.target.getVideoData(),
                      meta = story.el.find(".story .youtube[data-yid='" + dt.video_id + "']").parent().find(".r"),
                      played = meta.hasClass("played");
                    if(event.data === YT.PlayerState.PLAYING) {
                      if(!played) { meta.addClass("played"); }
                      meta.delay(7000).fadeOut(played ? 400 : 1000);
                    }
                    else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                      meta.fadeIn(400);
                    }
                  }
                }
              }
            );
          });

          popup.el.find(".youtube[data-yid]").each(function (d, i) {
            var id = this.id, yid = this.dataset.yid;
            youtubePlayers[yid] = new YT.Player(
              id,
              {
                videoId: yid,
                width: "100%",
                playerVars:{ showinfo: 0, loop: 1, autoplay: 0, rel: 0, cc_load_policy: 1, hl: lang }
              }
            );
          });
          loader.inc();
          setTimeout(load.effects, 100);
        };
      },
      audio: function () { /*console.log("load.audio");*/
        var cnt = 0, tmp,
          expect_cnt = panorama.audio.count,
          ext = panorama.audio.ext,
          path = panorama.audio.path;
        loader.retick(1, 16);

        for(var i = 1; i <= expect_cnt; ++i) {
          panorama.audio.elem.push($("<audio>",
            {
              preload: "auto",
              loop: true,
              muted: true,
              canplay: function (e) { loader.inc(); if(++cnt === expect_cnt) { setTimeout(load.youtube, 100); } $(e.target).off("canplay"); },
              error: function (e) { console.log(this, e, "error in load audio for one of the file"); },
              "src": (path + i + "." + ext + timestamp)
            }).get(0));
        }
      },
      panels_process: function () { /*console.log("load.panels_process");*/
        var f_tmp, b_tmp, flg, serializer = typeof window.XMLSerializer !== "undefined" ? new XMLSerializer() : undefined;
        panorama.panels.elem.forEach(function (d, i){
          f_tmp = d.get(0).contentDocument.documentElement;
          b_tmp = panorama.panels.bg_elem[i].get(0).contentDocument.documentElement;
          flg = f_tmp.hasOwnProperty("outerHTML") && typeof serializer !== "undefined";

          panorama.panels.svg.push(flg ? f_tmp.outerHTML : serializer.serializeToString(f_tmp));
          d.replaceWith(panorama.panels.svg[i]);

          panorama.panels.bg_svg.push(flg ? b_tmp.outerHTML : serializer.serializeToString(b_tmp));
          panorama.panels.bg_elem[i].replaceWith(panorama.panels.bg_svg[i]);

          panorama.panels.elem[i] = panorama.container.find(".panel[data-panel='" + (i+1) + "'] .fpanel svg");
        });

        setTimeout(load.audio, 100);
      },
      panels: function () { /*console.log("load.panels");*/
        var cnt = 0, bg, fg, mfg, expect_cnt = panorama.panels.count*2+1;
        loader.retick(12, 11);
        panorama.panels.names.forEach( function (d, i) {

          bg = $("<object type='image/svg+xml' data='" + (panorama.panels.path + "bg/" + d + ".svg" + timestamp) + "'>");
          panorama.panels.bg_elem.push(bg);
          bg.one("load", function (event){ loader.inc(); if(++cnt === expect_cnt) { setTimeout(load.panels_process, 100); } });
          panorama.container.find(".panel[data-panel='" + (i+1) + "'] .bpanel").append(bg);

          fg = $("<object type='image/svg+xml' data='" + (panorama.panels.path + "fg/" + d + ".svg" + timestamp) + "'>");
          panorama.panels.elem.push(fg);
          fg.one("load", function (event){ loader.inc(); if(++cnt === expect_cnt) { setTimeout(load.panels_process, 100); } });
          panorama.container.find(".panel[data-panel='" + (i+1) + "'] .fpanel").append(fg);

        });

        mfg = $("<object type='image/svg+xml' data='" + ("../assets/images/map_fg.svg" + timestamp) + "'>");

        mfg.one("load", function (event) { // plus load minimap foreground svg
          $(".preload-minimap").removeClass("preload-minimap");
          mfg.replaceWith(mfg.get(0).contentDocument.documentElement.outerHTML);
          loader.inc();
          if(++cnt === expect_cnt) { setTimeout(load.panels_process, 100); } });
        minimap.el.find(".fg").append(mfg);
      },
      partial: function () { /*console.log("load.partial");*/
        // panorama.audio.stop();
        // story.close();
        loader.restart();
        this.callback(true);
      },
      all: function () { /*console.log("load.all");*/
        is_desktop = device.desktop();
        is_mobile = !is_desktop;
        is_ios = device.ios();
        is_mac = isMacintosh();
        panorama.audio.ready = is_desktop;
        $(window).resize(function () { redraw(); });
        loader.start_animation();
        this.panels();
      }
    },
    page = {
      bind: function () {
        var t = this,
          hidden,
          visibilityChange,
          hiddens = ["hidden", "mozHidden", "msHidden", "webkitHidden"],
          visibilityChanges = ["visibilitychange", "mozvisibilitychange", "msvisibilitychange", "webkitvisibilitychange"];

        hiddens.forEach(function (d, i) {
          if(typeof document[d] !== "undefined") {
            hidden = d;
            visibilityChange = visibilityChanges[i];
            return;
          }
        });

        if (typeof document[hidden] === "undefined") {
          document[hidden] = document.hasFocus();
        }
        else {
          $(document).on(visibilityChange, function () { t.toggle(!document[hidden]); });
        }
      },
      toggle: function (state) {
        if(state) { panorama.audio.play(); }
        else { panorama.audio.stop(); }
      }
    };

  function redraw (programmatic) {/* console.log("redraw", programmatic, redraw_in_use);*/
    if(!programmatic && redraw_in_use) { return; }
    if(loader.completed) {
      load.partial();
      redraw_in_use = false;
    }
    else {
      if(!programmatic) { loader.abort(); }
      redraw_in_use = true;
      setTimeout(function () { redraw(true); }, 100);
    }
  }

  function resize () { /*console.log("resize");*/
    w = $(window).width();
    h = $(window).height();
    panorama.step = w/5;
    panorama.origin = w/2;
  }

  // for deployed version
  (function init () {

    // dev
    // I18n.init(function (){
    //   window.pn = panorama;
    //   I18n.remap();
    //   params.parse();
    //   //panorama.audio.muted = true;
    //   load.all();
    // });

    // deploy
    // panorama.audio.dev();
    // story.dev();
    // story.dev_story_thumbnail();
    // I18n.init(function (){ I18n.remap(); });

    // production
    params.parse();
    load.all();

  })();
});
