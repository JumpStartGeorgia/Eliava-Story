function playerObject()
{
  this.sounds = {};
  this.sounds_list = [];
  this.bgcat = null;
  this.bgint = null;

  var mute = false;
  var prev_volume = 1;
  var volume = 1;
  var readySoundCount = 0;
  var bgBothLoaded = 2;
  var sound_ext = 'mp3';
  this.init = function()
  {
    if(isOpera) sound_ext = 'ogg';
    this.sounds['award'] = assets.filter(function(d){return d.name == 'sound_award'; })[0].element[0];
    this.sounds['upgrade'] = assets.filter(function(d){return d.name == 'sound_upgrade'; })[0].element[0];
    this.sounds['endgood'] = assets.filter(function(d){return d.name == 'sound_endgood'; })[0].element[0];
    this.sounds['endbad'] = assets.filter(function(d){return d.name == 'sound_endbad'; })[0].element[0];
    this.sounds['motion'] = assets.filter(function(d){return d.name == 'sound_motion'; })[0].element[0];
    this.sounds_list = ['award','upgrade','endgood','endbad','motion'];
  };
  this.background_play = function()
  {
    bgBothLoaded = 2;
    var t = this;
    t.bgcat = $('<audio>',
    {
          on:
          {
          canplay: function() { t.background_ready(); },
          error: function(e) { console.log(this,e,"error");}
          },
          "src":'/assets/gap/sounds/category/' +(user.gender + category.fg + '.' + sound_ext)
      }).get(0);
    t.bgint = $('<audio>',
    {
          on:
          {
          canplay: function() { t.background_ready(); },
          error: function(e) { console.log(this,e,"error");}
          },
          "src":'/assets/gap/sounds/interest/' + interestAlias + '.' + sound_ext
      }).get(0);
    t.bgint.loop = true;
    t.bgcat.loop = true;
    t.bgcat.volume = 0.3;
    t.bgint.volume = 0.3;
    $(t.bgcat).on('playing', function() { t.bgint.currentTime = t.bgcat.currentTime; } );
  };
  this.background_ready = function(t)
  {
    var t = this;
    --bgBothLoaded;
    $(t).off('canplaythrough');

    if(bgBothLoaded == 0)
    {
      t.bgcat.play();
      t.bgint.play();
    }
  }
  this.background_stop = function()
  {
    var t = this;
    if(t.bgcat != null && t.bgint != null)
    {
      t.bgcat.pause();
      t.bgint.pause();
      t.bgcat.currentTime = 0;
      t.bgint.currentTime = 0;
    }
  }
  this.play = function play(name)
  {
    if(this.valid(name))
    {
      this.stop(name);
      //this.sounds[name].muted = false;
      this.sounds[name].play();
    }
  };
  this.stop = function(name)
  {
    if(this.valid(name))
    {
      this.sounds[name].pause();
      this.sounds[name].currentTime = 0;
      if (window.chrome) this.sounds[name].load()
    }
  };
  this.stop_all = function()
  {
    for(var i = 0; i < this.sounds_list.length; ++i)
    {
      var name = this.sounds_list[i];
      if(this.valid(name))
      {
        this.sounds[name].pause();
        this.sounds[name].currentTime = 0;
        if (window.chrome) this.sounds[name].load()
      }
    }
  };
  this.mute = function ()
  {
    try
    {
      mute = true;
      for(var i = 0; i < this.sounds_list.length; ++i)
      {
        var name = this.sounds_list[i];
        if(this.valid(name))
        {
          this.sounds[name].muted = true;
        }
      }
      this.bgcat.muted = true;
      this.bgint.muted = true;
      return true;
    }
    catch(e)
    {
      return false;
    }
  };
  this.unmute = function(name)
  {
    try
    {

      mute = false;
      this.bgcat.muted = false;
      this.bgint.muted = false;
      for(var i = 0; i < this.sounds_list.length; ++i)
      {
        var name = this.sounds_list[i];
        if(this.valid(name))
        {
          this.sounds[name].muted = false;

        }
      }
    }
    catch(e)
    {
      return false;
    }
  };
  this.valid = function(name)
  {
    var r = typeof this.sounds[name] !== "undefined" && this.sounds[name].readyState == 4;
    //if(!r) console.log("Audio file can't be played, please check path and additional parameters. File:",name); // when file is missing or not ready
    return r;
  };
  this.canplaythrough = function()
  {
    $(this).off('canplaythrough');
    if(readySoundCount+1 == sounds.length)
    {
      isSoundLoaded = true;
    }
    else ++readySoundCount;
  };
  // this.background_switch = function()
  // {

  // };
  this.init();
}
