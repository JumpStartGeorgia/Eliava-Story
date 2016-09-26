# Eliava-Story

## deploy process

  'WARNING' - string across files is flag that warns, pay attention if that string need to be changed


### share story
#### when text for story is new or meta data for shared page is changed, share files should be generated.
`
  cd /dev
  ruby reshare.rb
`
- this process will delete folder share under each locale folder ex: en/share,
- then recreates it and generate shared files (ex: the-poet.html) with new names based on latinized title.
- assets/js/meta.js file is recreated to have array of latinized titles for each language
- dev/share_template.erb.html file is used as template for generating html

#### image paths
  /assets/images/share/[1..N].png and one fb.png for whole site

Warning: if story count changed varibale story_count should be changed accordingly

### app
#### application has developer mode, which can be accessed by localhost/dev url
In this mode index.html behaves like template, it has no content just i18n properties that link to locale/[en|ka|ru].js file.
By default it uses 'en' locale, so whenever page is reloaded those properties are replaced with appropriate text ( default locale can be edited in I18n.js file `var default_locale = "en";`).
In main.js/init function for dev mode comment deploy and production blocks.

### deploy
- generate share story files
- comment dev and production block in main.js/init function, only deploy block should be uncommented
- generate main.min.css minified version via http://csscompressor.com/ based on main.css file
- generate main.min.js minified version via  based on main.js file
- in dev/index.html change main.css to main.min.css
- in dev/index.html comment scripts in the bottom which are ticked with comments deploy start end, comment whole text
- ['en', 'ka', 'ru'].forEach  {locale}
  * enter {locale} folder and replace index.html's all text with next line
    `<!DOCTYPE html>`
  * change I18n.js `var default_locale = "{locale}";`
  * in browser call localhost/dev
  * in browser devtools go to Elements tab, select <html> tag -> Edit as Html -> Copy whole text
  * open {locale}/index.html and append text
  * &lt; replace with <; &gt; replace with >
  * remove last script that is under <!-- deploy - remove extra script that points to locale file --> comment
  * uncomment previously commented text (I18n.js script can be deleted not tested but it should work)
  * if it is production change addthis id
- In main.js/init function comment all except block for production
- In case any asset (css, js, image, sound) was changed for client browser to refresh all assets change asset version.
  * generate new version based on current date (new Date()).getTime() ex: 1474438073705
  * replace current version (1474889297700) to new for all files

## TODO
  * in dev/index.html translate into russian and paste 'You need to turn on Javascript for this application to work!' into noscript block

## In case
  - if story structure that is visible in story popup will change, you can use story.dev(); function to generate that text it will be outputed in console, but change specific variables before (ex: story.count). make first story active add class .active to .story
  - if audio track amount or range between which audio is played changed, you can generate panorama.audio.play_range array, use comments in panorama.audio.dev() function,  but change specific variables before (ex: panorama.audio.count)

## Layer logic
  - we have 5 panels, that when join creates full panorama
  - each rendered panel consist of two svg files
    * one that is background and is in /assets/images/panels/bg/p[1-5].svg
    * and another  that is foreground with all objects and sub layers /assets/images/panels/fg/p[1-5].svg that is on top of background
    * (there is div.surface between them, it's purpose to drag layers
  - there is a difference between how this two svg's are rendered, background are inserted via object tag where foreground as inline svg
  - each foreground svg file can have one or more stories
  - if you open foreground svg file, under svg you will see one or couple <g> tags with id="story#"
  - each story group have (except big story where inner multiple objects will be grouped differently)
    * one white cutout of object
    * one cutout with drawing
    * one colored object
  - template:
    `
    <g id="story1">
      <image class="layer-colored" data-story="1"></image>
    </g>
    `
    ` old
    <g id="story1">
      <path class="layer-empty"/>
      <g class="layer-anim">
        <image class="layer-drawing"></image>
        <image class="layer-colored" data-story="1"></image>
      </g>
    </g>
    `
  - naming in raw svg is different so, if panel updated this should be cleaned and fixed by hand
  - in raw file story group has id, white layer has id layer0, drawing has id layer1 and colored id layer1
