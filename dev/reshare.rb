#!/usr/bin/ruby

class String
  def remove_lines(i)
    split("\n")[i..-1].join("\n")
  end
end

require 'rubygems'
require 'fileutils'
require 'json'
require 'pp'
require 'erb'
require 'unidecoder'

share_template = File.read('share_template.erb.html')
locales = ["en", "ka", "ru"]
story_count = 2 # WARNING this should be changed to actual story count


locales.each{|loc|
  next if loc != "en" # comment on production

  json = JSON.parse(File.read("../assets/locale/#{loc}.js").remove_lines(1)[0...-1])

  FileUtils.mkdir_p "../#{loc}/share"


  @url = json["url"]
  @share_url = json["share_url"]
  @share_sitename = json["share_sitename"]

  story_index = 1
  renderer = ERB.new(share_template)

  for story_index in 1..story_count
    story_data = json["stories"][story_index.to_s]
    @story_id = story_data["title"].to_ascii.downcase.gsub(" ", "-")
    puts @story_id
    @story_title = story_data["title"]
    @story_descr = story_data["description"]
    @story_share_url = @share_url + ""
    File.open("../#{loc}/share/#{story_index}.html", "w") { |file| file.write(renderer.result()) }

  end
}


{
  "а" => "a" ,
  "б" => "b" ,
  "в" => "v" ,
  "г" => "g" ,
  "д" => "d" ,
  "е" => "e" ,
  "ё" => "'o",
  "ж" => "'z",
  "з" => "z" ,
  "и" => "i" ,
  "й" => "j" ,
  "к" => "k" ,
  "л" => "l" ,
  "м" => "m" ,
  "н" => "n" ,
  "о" => "o" ,
  "п" => "p" ,
  "р" => "r" ,
  "с" => "s" ,
  "т" => "t" ,
  "у" => "u" ,
  "ф" => "f" ,
  "х" => "x" ,
  "ц" => "'t",
  "ч" => "'c",
  "ш" => "w" ,
  "щ" => "'w",
  "ъ" => "q" ,
  "ы" => "y" ,
  "ь" => "h" ,
  "э" => "'e",
  "ю" => "'u",
  "я" => "'a",
}

{
  ['ა'] => "a'",
['ბ'] => "b'",
['გ'] => "g'",
['დ'] => "d'",
['ე'] => "e'",
['ვ'] => "v'",
['ზ'] => "z'",
['ი'] => "i'",
['ლ'] => "l'",
['მ'] => "m'",
['ნ'] => "n'",
['ო'] => "o'",
['ჟ'] => "zh'",
['რ'] => "r'",
['ს'] => "s' ",
['ტ','თ'] => "t'",
['უ'] => "u'",
['პ','ფ'] => "p'",
['კ','ყ'] => "k'",
['ღ'] => "gh'",
['ქ'] => "q'",
['შ'] => "sh'",
['ძ'] => "dz'",
['ც','წ'] => "ts'",
['ჩ','ჭ'] => "ch'",
['ხ'] => "kh'",
['ჯ'] => "j' ",
['ჰ'] => "h' ",
}
