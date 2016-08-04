Object.keys(en.stories).forEach(function(k){
  var tmp = en.stories[k];
  console.log(tmp.title + ";" + tmp.quote + ";" + tmp.name + ";" + tmp.job + ";" + tmp.job_start_date);
});
