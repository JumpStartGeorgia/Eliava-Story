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
    'ъ' => '',
    'ы' => "y",
    'ь' => "",
    'э' => 'e',
    'ю' => 'yu',
    'я' => 'ya',
    'ё' => 'ye',
  }
end

def init
  share_template = File.read('share_template.erb.html')
  locales = ["en", "ka", "ru"]
  story_count = 10 # WARNING this should be changed to actual story count
  key_mapper = key_map
  story_titles = []

  locales.each_with_index{|loc, loc_i|
    # next if loc != "en" # comment on production
    @locale = loc
    begin
      json = JSON.parse(File.read("../assets/locale/#{loc}.js", :quirks_mode => true).remove_lines(1)[0...-1])
    rescue JSON::ParserError => e
      pp "#{loc} file is damaged"
    end

    fld = "../#{loc}/share"
    FileUtils.remove_dir fld if File.directory?(fld)
    FileUtils.mkdir_p fld

    url = json["domain"]
    url_with_locale_orig = url + "/" + loc

    share_dir_url = url_with_locale_orig + "/" + json["share_path"]

    url_with_locale_orig += "/?story=" # add / to match url rules

    @sitename = json["sitename"]

    renderer = ERB.new(share_template)

    for story_index in 1..story_count
      story_data = json["stories"]["s" + story_index.to_s]
      id = story_data["title"].to_ascii(key_mapper).downcase.gsub(" ", "-")
      if loc == "en"
        story_titles.push([id,id,id]);
      else
        story_titles[story_index-1][loc_i] = id
      end
      @title = story_data["title"]
      @descr = story_data["quote"].gsub('\\', "").gsub('"', "")
      @share_url = share_dir_url + "/" + id + ".html"
      # if each story wlll have it's own file use this @image = url + "/assets/images/share/#{story_index}.jpg"
      @image = url + "/assets/images/share/#{loc}.jpg?v=1477031376972"

      @url_with_locale = url_with_locale_orig + id

      File.open("../#{loc}/share/#{id}.html", "w") { |file| file.write(renderer.result()) }

    end
    File.open("../assets/js/meta.js", "w") { |file| file.write("var js = { story_titles: " + story_titles.to_s + "};") }
  }
end

init
