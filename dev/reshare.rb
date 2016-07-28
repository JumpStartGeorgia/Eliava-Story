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

def key_map
  {
    # geo to eng
    "ა" => "a",
    "ბ" => "b",
    "გ" => "g",
    "დ" => "d",
    "ე" => "e",
    "ვ" => "v",
    "ზ" => "z",
    "ი" => "i",
    "ლ" => "l",
    "მ" => "m",
    "ნ" => "n",
    "ო" => "o",
    "ჟ" => "zh",
    "რ" => "r",
    "ს" => "s",
    "ტ" => "t",
    "თ" => "t",
    "უ" => "u",
    "პ" => "p",
    "ფ" => "p",
    "კ" => "k",
    "ყ" => "k",
    "ღ" => "gh",
    "ქ" => "q",
    "შ" => "sh",
    "ძ" => "dz",
    "ც" => "ts",
    "წ" => "ts",
    "ჩ" => "ch",
    "ჭ" => "ch",
    "ხ" => "kh",
    "ჯ" => "j",
    "ჰ" => "h",

    # rus to eng
    'а' => 'a',
    'б' => 'b',
    'в' => 'v',
    'г' => 'g',
    'д' => 'd',
    'е' => 'e',
    'ж' => 'zh',
    'з' => 'z',
    'и' => 'i',
    'й' => 'y',
    'к' => 'k',
    'л' => 'l',
    'м' => 'm',
    'н' => 'n',
    'о' => 'o',
    'п' => 'p',
    'р' => 'r',
    'с' => 's',
    'т' => 't',
    'у' => 'u',
    'ф' => 'f',
    'х' => 'h',
    'ц' => 'ts',
    'ч' => 'ch',
    'ш' => 'sh',
    'щ' => 'Shch',
    'ъ' => '"',
    'ы' => "y",
    'ь' => "'",
    'э' => 'e',
    'ю' => 'yu',
    'я' => 'ya',
    'ё' => 'ye',
  }
end

def init
  share_template = File.read('share_template.erb.html')
  locales = ["en", "ka", "ru"]
  story_count = 2 # WARNING this should be changed to actual story count
  key_mapper = key_map

  locales.each{|loc|
    #next if loc != "en" # comment on production
    @locale = loc

    json = JSON.parse(File.read("../assets/locale/#{loc}.js").remove_lines(1)[0...-1])

    fld = "../#{loc}/share"
    FileUtils.remove_dir fld if File.directory?(fld)
    FileUtils.mkdir_p fld

    url = json["url"]
    @url_with_locale = url + "/" + loc

    share_dir_url = @url_with_locale + "/" + json["share_url"]

    @url_with_locale += "/" # add / to match url rules

    @sitename = json["share_sitename"]

    renderer = ERB.new(share_template)


    for story_index in 1..story_count

      story_data = json["stories"]["s" + story_index.to_s]
      id = story_data["title"].to_ascii(key_mapper).downcase.gsub(" ", "-")
      @title = story_data["title"]
      @descr = story_data["description"]
      @share_url = share_dir_url + "/" + id + ".html"
      @image = url + "/assets/images/share/#{story_index}.png"

      File.open("../#{loc}/share/#{id}.html", "w") { |file| file.write(renderer.result()) }

    end
  }
end

init
