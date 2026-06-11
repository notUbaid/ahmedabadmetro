const getDayType = (date = new Date()) => {
  const day = date.getDay();
  return day === 0 ? 'Sunday' : day === 6 ? 'Saturday' : 'Mon-Fri';
};

console.log("Date.now() + 86400000 is:", new Date(Date.now() + 86400000).toString());
console.log("Day type:", getDayType(new Date(Date.now() + 86400000)));
