/*global  $ debounce I18n YT exist isNumber js getRandomIntInclusive device addWheelListener */
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
    lang = document.documentElement.lang || "en",
    story_mode = false,
    popup_mode = false,
    on_esc = {},
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
        current: 3,
        svg: []
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
        default_volume: 0, // deploy 0.6
        fade_duration: 500,
        can_play: true,
        ok: function () {
          return this.current >= 1 && this.current <= this.count;
        },
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
          if(this.ok()) { this.elem[this.current].muted = true; }
          this.toggle.addClass("muted");
        },
        unmute: function () {
          this.muted = false;
          if(this.ok()) { this.elem[this.current].muted = false; }
          this.toggle.removeClass("muted");
        },
        softMute: function () {
          this.soft_muted = true;
          if(this.ok()) { this.elem[this.current].muted = true; }
        },
        softUnMute: function () {
          this.soft_muted = false;
          if(!this.muted) {
            if(this.ok()) { this.elem[this.current].muted = false; }
          }
        },
        muteToggle: function () {
          this.muted ? this.unmute() : this.mute();
        },
        bind: function () {
          var t = this;
          $(".sound-toggle").click(function () { t.muteToggle(); });
        }
      },
      position: {
        analyze: function (pos, sync_minimap) {
          if(typeof sync_minimap !== "boolean") { sync_minimap = true; }
          // console.log(pos);
          var normalized_pos = -1*((pos + panorama.left_width) % panorama.story_width), percent, best_i = -2, best_w = 99999999999;
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
          if(sync_minimap) { map.sync(); }
          // if(device.desktop()) {
          //   story.x_center.forEach(function (d, i) {
          //     var pbbox = panorama.container.get(0).getBoundingClientRect(),
          //       bbox = panorama.container.find("#story" + (i+1)).get(0).getBoundingClientRect();


          //     console.log(i+1, bbox, pos, pbbox);
          //     if(pos >= bbox.left && pos <= bbox.left + bbox.width && best_w > Math.abs(pos-bbox.width)) {
          //       best_i = i;
          //       best_w = Math.abs(pos-bbox.width);
          //     }
          //   });
          //   map.select_by_id(best_i+1);
          // }
        },
        flip: function (pos) {
          var tmp;
          if(pos <= -1 * panorama.offset.right) { //
            tmp = -1 * panorama.offset.left - (-1*pos - panorama.offset.right); // arrow right moving (left), happens when last panel goes out from left side of the screen, (-1*pos - panorama.offset.right) this is for extra pixels
            // console.log("flip to beggining", tmp);
            panorama.container_position = tmp;
            panorama.container.css("transform", "translateX(" + tmp + "px)");
          }
          else if(pos >= w - panorama.offset.left) {
            tmp = -1 * (panorama.offset.right - w - (pos - (w-panorama.offset.left))); // arrow left moving (right), happens when first panel goes out from right side of the screen, (pos - (w-panorama.offset.left)) this is for extra pixels
            // console.log("flip to the end", tmp);
            panorama.container_position = tmp;
            panorama.container.css("transform", "translateX(" + tmp + "px)");
          }
        }
      },
      animator: {
        finished: false,
        timeout_id: undefined,
        after_hover_count: 1,
        play: function () {
          if(!device.desktop()) { return; }
          var tp = this;
          if(tp.finished) return;
          //console.log("animator", after_hover_count);
          if(tp.after_hover_count !== 1) {
            tp.timeout_id = setTimeout(function () { tp.play(); }, 100);
            return;
          }
          // //console.log("animator inside");
          // var layer_anim = $(".layer-anim"), ln = layer_anim.length;
          // tp.after_hover_count = 0;
          // layer_anim.each(function (d) {
          //   ++tp.after_hover_count;
          //   // console.log("plus one", after_hover_count);
          //   var t = $(this), stid = +t.find("[data-story]").attr("data-story"), dir = story.breath_direction[stid-1] === 0 ? "left" : "right";
          //   t.velocity("js.breath_" + dir, { delay: 1000, complete: (d === ln - 1 ? function () {/*console.log("animator end");*/ tp.play();} : function () { /*console.log("minus one", d , after_hover_count-1);*/ --tp.after_hover_count; }) });
          // });
          $(".layer-colored").velocity("js.fade", { delay: 900 });
        },
        bind: function (first) {
          var tp = this,
            prefix = first ? "" : ".ghost ",
            layer_anim = $(prefix + ".layer-anim"),
            layer_color = $(prefix + ".layer-colored").addClass("anim-object");

          if(device.desktop()) {
            layer_color.hover(function () { /*console.log("hover in");*/
              var t = $(this), p = t.parent();
              tp.finished = true;
              if(typeof tp.timeout_id !== "undefined") { clearTimeout(tp.timeout_id); }
              // layer_anim.velocity("finish");
              layer_color.velocity("finish");
            }, debounce(function () {/* console.log("hover out");*/
              tp.finished = false;
              tp.play();
            }, 100) );
          }

          layer_color.click(function () { story.open(+$(this).attr("data-story")); });
        },
        hover_play: function () {
          // hover_animator_id = undefined;

          // function animator_js_hover (id) {
          //   console.log("animator_js_hover");
          //   if(after_hover_count !== 1) {
          //     hover_animator_id = setTimeout(function () { animator_js_hover(id); }, 100);
          //   }
          //   else {
          //     $("#story" + id + " .layer-anim").velocity("js.hover", { delay: 100, complete: function () { animator_js_hover(id); } });
          //   }
          // }
        }
      },
      scroll_by_pos: function (pos) {
        var t = this, prev = t.container_position;

        t.container_position = pos;
        t.container.velocity({ translateX : [pos, prev]}, { duration: 500, easing: "linear",
          complete: function () {
            if(pos <= -1 * t.offset.right || pos >= w - t.offset.left) {
              t.position.flip(pos);
            }
          }
        });

        t.position.analyze(pos);
      },
      scroll_by_pos_direct: function (pos) {
        console.log("direct", pos);
        var t = this, prev = t.container_position;

        t.container_position = pos;
        t.container.css("transform", "translateX(" + pos + "px)");
        if(pos <= -1 * t.offset.right || pos >= w - t.offset.left) {
          t.position.flip(pos);
        }
        t.position.analyze(pos, false);
      },
      scroll: function (direction) { /*console.log("panorama_scroll");*/
        var t = this;
        console.log(t.container_position + -1*direction*t.step);
        t.scroll_by_pos(t.container_position + -1*direction*t.step);
      },
      bind: function (first) {
        var t = this;

        t.el.find("object, .apanel").css("height", h - (h > 992 ? 120 : 60));

        if(first) {
          t.audio.bind();

          var scrl_left = debounce(function () { helper.hide(); tooltip.hide(); t.scroll(-1); }, 100),
            scrl_right = debounce(function () { helper.hide(); tooltip.hide(); t.scroll(1); }, 100);

          $(document).keydown(function ( event ) {
            if (!event) {event = window.event;} // for IE compatible
            var keycode = event.keyCode || event.which; // also for cross-browser compatible
            if (keycode == Key.LEFT && popup_mode) { story_mode ? story.prev() : scrl_left(); }
            if (keycode == Key.RIGHT && popup_mode) { story_mode ? story.next() : scrl_right(); }

            if(keycode === Key.ESC) {
              Object.keys(on_esc).forEach(function (d) {
                if(typeof on_esc[d] === "function") {
                  on_esc[d]();
                }
              });
            }
          });

          addWheelListener(document, function (event) {
            if(!popup_mode && event.deltaY !== -0 && event.deltaY !== 0) {
              event.deltaY <= -0 ? scrl_left() : scrl_right();
            }
          });
        }

        t.animator.bind(first);
        t.el.find((first ? "" : ".ghost ") + ".surface").draggable(
          {
            axis: "x",
            start:  function (event, ui) {
              //console.log("start", event, ui);
              t.surface = $(event.target);
              if(first && !helper.hidden) { helper.hide(); }
            },
            drag: function (event, ui) {
              //console.log("drag", event, ui);
              var pos = t.container_position + (ui.position.left - t.surface_position);
              t.surface_position = ui.position.left;

              if(pos <= -1 * t.offset.right || pos >= w - t.offset.left) {
                t.position.flip(pos);
              }
              else {
                t.container_position = pos;
                t.container.css("transform", "translateX(" + pos + "px)");
              }
              t.position.analyze(pos);
            },
            stop: function (event, ui) {
              //console.log("stop", event, ui);
              // t.el.find(".surface").css("left", 0);
              t.surface.css("left", 0);
              t.surface_position = 0;
            }
          }
        );
      }
    },
    story = {
      el: $("#story_popup"),
      // content: $("#story_popup .content"),
      content: $("#story_popup .content"),
      share: $(".share-story .addthis_sharing_toolbox"),
      opened: false,
      current: 5,
      count: 11, // * WARNING on story count change
      breath_direction: [1, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0], // left 0, right 1
      x_center: [],
      //story_range: [[13, 15], [20, 22], [30, 31]],
      meta: {},
      by_url: false,
      to_panel: [1, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5], // index is story value is panel #
      dev: function () { // * WARNING if story popup structure change call this and grab copy/paste console output to input.html, generate all locales
        var html, i;
        for(i = 1; i <= this.count; ++i) {
          html += `
            <div class="story" data-id="${i}" data-i18n-stories-s${i}-yid="data-yid">
              <div class="title" data-i18n-stories-s${i}-title="text"></div>
              <div class="scroll-box">
                <div class="youtube" data-i18n-stories-s${i}-yid="data-yid" data-i18n-stories-s${i}-player_yid="id"></div>
                <div class="r">
                  <div class="c">
                    <div class="name"><span class="b" data-i18n-label-name></span><span data-i18n-stories-s${i}-name></span></div>
                    <div class="job"><span class="b" data-i18n-label-job></span><span data-i18n-stories-s${i}-job></span></div>
                    <div class="job_start_date" ><span class="b" data-i18n-label-job_start_date></span><span data-i18n-stories-s${i}-job_start_date="text"></span></div>
                  </div>
                  <div class="c">
                    <div class="quote" data-i18n-stories-s${i}-quote="text"></div>
                  </div>
                </div>
              </div>
            </div>`;
        }

        console.log(html);
      },
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
        map.select_by_id(id);
        t.content.find(".story .scroll-box").css({ "height": ( t.el.find(".window").height() - t.el.find(".active .scroll-box").position().top - 20) + "px" });
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
            if(play && typeof pl.playVideo === "function") { pl.playVideo(); }
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
          if(!device.desktop()) {
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
        // story.x_center = [];
        // for(i = 1; i <= this.count; ++i) {
        //   pnl = t.to_panel[i-1]-1;
        //   tmp = panorama.panels.elem[pnl].find("#story" + i + " .layer-colored");
        //   bbox = tmp.get(0).getBoundingClientRect();
        //   x1 = bbox.left-panorama.left_width;
        //   xw = bbox.width;
        //   xm = x1 + xw/2;
        //   x2 = x1 + xw;
        //   story.x_center.push([x1, x2, xm]);
        //   console.log(story.x_center);
        // }
      },
      go_to: function (id, shake) {
        var st = $("#story" + id),
          pnl = +st.closest(".apanel").attr("data-panel"),
          pbbox = panorama.container.get(0).getBoundingClientRect(),
          bbox = st.get(0).getBoundingClientRect();

        panorama.scroll_by_pos((pbbox.left - bbox.left) + w/2 - bbox.width/2);

        if(shake === true) {
          story.off_animation();
          $("#story" + id + " .layer-colored").velocity({ opacity: 1}, { delay: 300, duration: 1000, easing: "easeInOutCubic", reset: { opacity: 0.1 }});
          //$("#story" + id + " .layer-anim").velocity("js.shake", { delay: 300, complete: function () { panorama.animator.play(); } });
        }
      },
      go_to_and_open_current: function () {
        var id = this.current;

        var st = $("#story" + id),
          pnl = +st.closest(".apanel").attr("data-panel"),
          pbbox = panorama.container.get(0).getBoundingClientRect(),
          bbox = st.get(0).getBoundingClientRect();

        panorama.scroll_by_pos((pbbox.left - bbox.left) + w/2 - bbox.width/2);
        if(story.by_url) {
          helper.hidden = true;
          helper.el.hide();
          story.open(id, function () { loader.inc(4); });
          story.by_url = false;
        }
        else {
          helper.hide(4000);
          loader.inc(4);
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
        $(".layer-anim").velocity("finish");
        $(".layer-colored").velocity("finish");
      },
      on_animation: function () {
        panorama.animator.play();
      }
    },
    tooltip = {
      template: $(".tooltip-template").html(),
      text_by_story: function (id) {
        var st, mt;
        if(!story.meta.hasOwnProperty(id)) {
          st = story.el.find(".story[data-id='" + id + "']");
          story.meta[id] = {
            title: st.find(".title").text(),
            quote: st.find(".quote").text(),
            name: st.find(".name span:last-of-type").text(),
            job: st.find(".job span:last-of-type").text(),
            job_start_date: st.find(".job_start_date span:last-of-type").text()
          };
        }
        mt = story.meta[id];
        return this.template
          .replace("{{title}}", mt.title)
          .replace("{{quote}}", '"' + mt.quote + '"')
          .replace("{{name}}", mt.name)
          .replace("{{job}}", mt.job)
          .replace("{{job_start_date}}", mt.job_start_date);
      },
      bind: function (first) {
        if(!device.desktop()) { return; }
        $((first ? "" : ".ghost" ) + ".apanel .layer-colored").qtip({
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
      },
      hide: function () {
        $(".qtip:visible").qtip("hide");
      }
    },
    popup = {
      el: $("#popup"),
      content: $("#popup .content"),
      close: function () {
        popup_mode = false;
        this.el.attr("data-type", "");
        delete on_esc["popup_to_close"];
      },
      open: function (v) {
        var t = this;
        popup_mode = true;
        t.el.attr("data-type", v);
        t.content.scrollTop(0).css({ "height": (h > 760 ? h - 88 - 61 - 60 - 10 : h - 2*61) + "px" });
        on_esc["popup_to_close"] = function () { t.close(); };
      },
      bind: function () {
        var t = this;
        t.el.find(".close, .bg").on("click", function () { t.close(); });
      }
    },
    nav = {
      nv: $(".nav"),
      el: $(".nav-menu"),
      bind: function () {
        var tp = this;

        $(document).on("click", ".nav-prev", function () { story.prev(true); });
        $(document).on("click", ".nav-next", function () { story.next(true); });

        $(document).on("click", ".nav-menu-toggle", function () {
          var tmp = tp.el.attr("data-menu");
          tp.el.attr("data-menu", tmp === "main" ? "" : "main");
          $(this).toggleClass("active");
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

        tp.nv.find("a[data-popup-target]").on("click", function () { popup.open($(this).attr("data-popup-target")); });
      }
    },
    map = {
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
        t.img = t.el.find("object");

        t.img_w = t.img.width();

        t.overlay = t.el.find(".overlay");

        t.light_w = Math.ceil(w/panorama.story_width*t.img_w);
        if(t.light_w % 2) { ++t.light_w; }

        t.cape_w = t.img_w - t.light_w;

        t.light = t.overlay.find(".light_main");
        t.lights = t.overlay.find(".light").width(t.light_w);
        t.capes = t.overlay.find(".cape").width(t.img_w-t.light_w);

        t.pos = -1*(2*t.cape_w + t.light_w);
        t.overlay.css("transform", "translateX(" + t.pos + "px");

      },
      bind: function () {
        var t = this, prev_x, cont;

        t.init();

        cont = $(t.img.get(0).contentDocument);
        cont.find("path.obj").click(function () {
          story.go_to(+$(this).attr("data-id"));

        });


        t.lights.draggable(
          {
            axis: "x",
            start:  function (event, ui) { prev_x = event.clientX; },
            drag: function (event, ui) {
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

              t.overlay.css("transform", "translateX(" + t.pos + "px");

              panorama.scroll_by_pos_direct(-1 * (Math.abs(start_pos)/t.img_w * panorama.story_width + panorama.offset.left));

              prev_x = event.clientX;
              ui.position.left = 0;
            }
          }
        );
      },
      sync: function () {
        var t = this, start_pos;

        start_pos = -1 * panorama.container_position - panorama.offset.left;
        //if(start_pos < 0) { start_pos = panorama.story_width - start_pos; }
        t.pos = -1 * ( 2 * t.cape_w + t.light_w - start_pos / panorama.story_width * t.img_w);
        t.overlay.css("transform", "translateX(" + t.pos + "px");
      },
      select_by_id: function (id) {
        var t = this;
        // t.points.removeClass("active");
        // if(id !== -1) { t.el.find("[data-id='" + id + "']").addClass("active"); }
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
      inc: function (percent) {
        var t = this, init_percent = percent;
        if(t.completed) return;
        if(typeof percent === "undefined") { percent = 0; }

        percent += t.progress;

        if(percent < 0) { percent = 0; }
        else if(percent >= 100) { percent = 100; }

        t.progress = percent;
        t.progress_label.text(Math.ceil(t.progress));
        // console.log(percent);

        if(percent >= 100) { t.complete(); }
      },
      start_animation: function () {
        var t = this;
        if(!loaderReady) { setTimeout(function () { t.start_animation(); }, 100); return; }
        if(!t.path) {
          t.path = t.image.get(0).contentDocument.getElementsByTagName("path")[0];
          $(t.path).css("stroke-dasharray", t.length + "px");
          t.length = t.path.getTotalLength();
        }
        $(t.path).css("stroke-dashoffset", 0);
        $(t.path).velocity({ "stroke-dashoffset": -1*t.length + "px" },
          {
            duration: t.animate_duration,
            complete: function () {
              if(t.animate) { t.start_animation(); }
            }
          }
        );
      },
      complete: function () {
        // console.log("loader.complete");
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
      hide: function (delay) {
        typeof delay === "undefined" ? this.el.fadeOut(800) : this.el.delay(delay).fadeOut(1000);
      }
    },
    load = {
      first_time: true,
      bind: function () { /*console.log("load.bind");*/
        console.timeEnd("a");
        console.time("a");
        if(loader.aborted) { loader.abort_complete(); return; }
        panorama.bind(load.first_time);
        tooltip.bind(load.first_time);
        story.bind(load.first_time);
        if(load.first_time) {
          nav.bind();
          map.bind();
          popup.bind();
          load.first_time = false;
        }
        story.go_to_and_open_current();
        console.timeEnd("a");
      },
      callback: function (is_partial) { /*console.log("load.callback");*/
        console.timeEnd("a");
        console.time("a");
        if(loader.aborted) { loader.abort_complete(); return; }

        resize();

        var tmp, tmp_w = 0, tmp_i = 0, pnl, expect_cnt = 0, cnt = 0, svg, html = panorama.panels.svg;
        panorama.container.find(".panel.ghost").remove();
        panorama.panels.w = [];
        panorama.width = 0;

        panorama.panels.elem.forEach(function (d, i){
          tmp = d.width();
          panorama.panels.w.push(tmp);
          panorama.width += tmp;
        });
        panorama.story_width = panorama.width;

        var template_panel = "<div class='panel ghost'></div>",
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

        var percent_step = (is_partial ? 96 : 46) / (expect_cnt*2);

        tmp_w = 0, tmp_i = 0;
        while(tmp_w < w) {
          pnl = $(template_panel).appendTo(panorama.container);

          tmp = $(template_object.replace("%id", "r" + (tmp_i+1)).replace("%type", "bg"));
          tmp.one("load", function (event) { loader.inc(percent_step); if(++cnt === expect_cnt) { setTimeout(load.bind, 100); } });
          tmp.attr("data", (panorama.panels.path + "bg/" + panorama.panels.names[tmp_i] + ".svg"));
          pnl.append(tmp);

          pnl.append("<div class='surface'></div>");
          svg = $("<div class='apanel noselect' data-panel='r" + (tmp_i+1) + "' data-type='fg'>").appendTo(pnl);
          tmp = $(template_object.replace("%id", "r" + (tmp_i+1)).replace("%type", "bg"));
          tmp.one("load", { pnl_i: tmp_i }, function (event) {
            $(this).replaceWith(html[event.data.pnl_i].replace(/id\=\"story/g, "id=\"story_r_"));
            loader.inc(percent_step);
            if(++cnt === expect_cnt) { setTimeout(load.bind, 100); } });
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
          tmp.one("load", function (event) { loader.inc(percent_step); if(++cnt === expect_cnt) { setTimeout(load.bind, 100); } });
          tmp.attr("data", (panorama.panels.path + "bg/" + panorama.panels.names[tmp_i] + ".svg"));
          pnl.append(tmp);

          pnl.append("<div class='surface noselect'></div>");
          svg = $("<div class='apanel noselect' data-panel='l" + (tmp_i+1) + "' data-type='fg'>").appendTo(pnl);
          tmp = $(template_object.replace("%id", "l" + (tmp_i+1)).replace("%type", "fg"));
          tmp.one("load", { pnl_i: tmp_i }, function (event) {
            $(this).replaceWith(html[event.data.pnl_i].replace(/id\=\"story/g, "id=\"story_l_"));
            loader.inc(percent_step);
            if(++cnt === expect_cnt) { setTimeout(load.bind, 100); } });
          tmp.attr("data", (panorama.panels.path + "fg/" + panorama.panels.names[tmp_i] + ".svg"));
          svg.append(tmp);


          tmp_w += panorama.panels.w[tmp_i];
          if(--tmp_i === 0) tmp_i = panorama.panels.count - 1;
        }
        panorama.left_width = tmp_w;
        panorama.width += tmp_w;

        panorama.offset.right = panorama.width - panorama.right_width;
        panorama.offset.left = panorama.left_width;
        if(expect_cnt === 0) { loader.inc(is_partial ? 96 : 46); setTimeout(load.bind, 100); }
      },
      effects: function () { /*console.log("load.effects");*/
        console.timeEnd("a");
        console.time("a");
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
        console.timeEnd("a");
        console.time("a");
        var tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = function () {

          $("#story_popup .story .youtube[data-yid], #popup .section .youtube[data-yid]").each(function (d, i) {
            var id = this.id, yid = this.dataset.yid;
            youtubePlayers[yid] = new YT.Player(
              id,
              {
                videoId: yid,
                height: "100%",//device.mobile() ? "auto" : "558", // this was 600 but changed it to 558 so captions in video are visible without scrolling
                width: "100%",
                playerVars:{ showinfo: 0, loop: 1, autoplay: 0, rel: 0 }
              }
            );
          });
          loader.inc(6);
          setTimeout(load.effects, 100);
        };
         // loader.inc(6);
         //  setTimeout(load.effects, 100);
      },
      audio: function () { /*console.log("load.audio");*/
        console.timeEnd("a");
        console.time("a");
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
                canplay: function (event) { loader.inc(.25); if(++cnt === expect_cnt) { setTimeout(load.youtube, 100); } },
                error: function (e) { console.log(this, e, "error in load audio for one of the file"); }
              },
              "src": (path + i + "." + ext)
            }).get(0));
        }
      },
      panels_process: function () { /*console.log("load.panels_process");*/
        console.timeEnd("a");
        console.time("a");
        panorama.panels.elem.forEach(function (d, i){
          panorama.panels.svg.push(d.get(0).contentDocument.documentElement.outerHTML);
          d.replaceWith(panorama.panels.svg[i]);
          panorama.panels.elem[i] = panorama.container.find(".apanel[data-panel='" + (i+1) + "'][data-type='fg'] svg");
        });
        setTimeout(load.audio, 100);
      },
      panels: function () { /*console.log("load.panels");*/
      console.time("a");
        var cnt = 0, bg, fg;
        panorama.panels.names.forEach( function (d, i) {
          bg = panorama.container.find("object[data-panel='" + (i+1) + "'][data-type='bg']");
          bg.one("load", function (event){ loader.inc(4); if(++cnt === panorama.panels.count*2) { setTimeout(load.panels_process, 100); } });
          bg.attr("data", panorama.panels.path + "bg/" + d + ".svg");


          fg = panorama.container.find(".apanel[data-panel='" + (i+1) + "'][data-type='fg'] object");
          panorama.panels.elem.push(fg);
          fg.one("load", function (event){ loader.inc(4); if(++cnt === panorama.panels.count*2) { setTimeout(load.panels_process, 100); } });
          fg.attr("data", panorama.panels.path + "fg/" + d + ".svg");
        });
      },
      partial: function () { /*console.log("load.partial");*/
        panorama.audio.stop();
        story.close();
        loader.restart();
        this.callback(true);
      },
      all: function () { /*console.log("load.all");*/
        $(window).resize(function () { redraw(); });
        loader.start_animation();
        this.panels();
      }
    };

  function ready () {

    // panorama.audio.muteToggle();
  }
  var redraw_in_use = false;
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
/*  (function init () {
    params.parse();
    load.all();
  })();*/

  // for dev version
/*  (function dev_init () {
    I18n.init(function (){
      I18n.remap();
      params.parse();
      load.all();
    });
  })();*/

  // for deploing process
  (function deploy_init () {
    // panorama.audio.dev();
    // story.dev();
    I18n.init(function (){ I18n.remap(); });
  })();
});
