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
In main.js file go to the bottom and comment init and deploy_init if you are using dev mode.

### deploy
- generate share story files
- comment init and dev_init in main.js, only deploy_init should be uncommented
- generate main.min.css minified version via http://csscompressor.com/ based on main.css file
- in dev/index.html change main.css to main.min.css
- in dev/index.html comment scripts in the bottom which are ticked with comments deploy start end, comment whole text
- ['en', 'ka', 'ru'].forEach  {locale}
  * enter {locale} folder and replace index.html's all text with next line
    `<!DOCTYPE html>`
  * change I18n.js `var default_locale = "{locale}";`
  * in browser call localhost/dev
  * in browser devtools go to Elements tab, select <html> tag -> Edit as Html -> Copy whole text
  * open {locale}/index.html and append text
  * remove last script that is under <!-- deploy - remove extra script that points to locale file --> comment
  * uncomment previously commented text (I18n.js script can be deleted not tested but it should work)
  * if it is production change addthis id


## TODO
  * in dev/index.html translate into russian and paste 'You need to turn on Javascript for this application to work!' into noscript block

## In case
  - if story structure that is visible in story popup will change, you can use story.dev(); function to generate that text it will be outputed in console, but change specific variables before (ex: story.count)
  - if audio track amount or range between which audio is played changed, you can generate panorama.audio.play_range array, use comments in panorama.audio.dev() function,  but change specific variables before (ex: panorama.audio.count)
