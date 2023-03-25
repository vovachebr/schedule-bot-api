function getLessonText(lesson){
  let { text: template } = lesson;
  options = {
    month: 'numeric',
    day: 'numeric'
  };
  let todayDay = new Date().toISOString().slice(5,10);
  const getMounth = (num) => [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря"][num];
  const splittedData = todayDay.split("-");
  splittedData[0] = getMounth(+splittedData[0] - 1);
  splittedData[1] = +splittedData[1];
  template = template.replace("{date}", splittedData.reverse().join(' '));
  template = template.replace("{time}", lesson.time);
  template = template.replace("{lector}", lesson.teacher);
  template = template.replace("{lesson}", lesson.lecture);
  template = template.replace("{additional}", lesson.additional || "");
  return template;
}

module.exports = getLessonText;