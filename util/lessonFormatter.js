function getLessonText(lesson){
  let template = "Добрый день! \nСегодня, {date}, в {time} по московскому времени состоится занятие «{lecture}». Ее проведет {teacher}. {additional} \n\nСсылку на трансляцию вы найдете в личном кабинете и в письме, которое сегодня придет вам на почту за два часа до лекции.";
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
  template = template.replace("{teacher}", lesson.teacher);
  template = template.replace("{lecture}", lesson.lecture);
  template = template.replace("{additional}", lesson.additional || "");
  return template;
}

module.exports = getLessonText;