Object.keys(en.stories).forEach(function(k){
  var tmp = en.stories[k];
  console.log(tmp.title + ";" + tmp.quote + ";" + tmp.name + ";" + tmp.job + ";" + tmp.job_start_date);
});



        // var tmp_w = panorama.left_width;
        // for(var i = 0; i < panorama.panels.current - 1; ++i) {
        //   tmp_w += panorama.panels.w[i];
        // }
        // panorama.container_position = -1 * tmp_w;
        // // console.log(panorama.container_position);
        // panorama.container
        //   .css("transform", "translateX(" + (-1 * tmp_w) + "px)");


          // var pl;
          // Object.keys(youtubePlayers).forEach(function (k) {
          //   pl = youtubePlayers[k];
          //   if(pl && typeof pl.unMute === "function") { pl.unMute(); }
          // });
