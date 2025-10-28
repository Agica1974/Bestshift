// holidays.js – Deutsche Feiertage pro Bundesland als Appointments

// Bundesland-Codes: BW, BY, BE, BB, HB, HH, HE, MV, NI, NW, RP, SL, SN, ST, SH, TH
// (BY hat Sonderfall Mariä Himmelfahrt nur in kath. Gemeinden – wir vereinfachen auf ganz BY)

(function(){
  const APPT_KEY = "savedAppointments";

  function dateKeyOf(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function on(y,m,d){ return new Date(y,m-1,d); }

  // Gaußsche Osterformel – Ostersonntag
  function easterSunday(year) {
    const f = Math.floor;
    const a=year%19, b=f(year/100), c=year%100, d=f(b/4), e=b%4;
    const g=f((8*b+13)/25), h=(19*a+b-d-g+15)%30, i=f(c/4), k=c%4;
    const l=(32+2*e+2*i-h-k)%7, m=f((a+11*h+22*l)/451);
    const month=f((h+l-7*m+114)/31); // 3=March,4=April
    const day=((h+l-7*m+114)%31)+1;
    return on(year, month, day);
  }

  function addDays(d, n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }

  // Grundmenge bundesweit
  function baseNationwide(year) {
    const easter = easterSunday(year);
    return [
      { name: "Neujahr",          date: on(year,1,1) },
      { name: "Karfreitag",       date: addDays(easter, -2) },
      { name: "Ostermontag",      date: addDays(easter, +1) },
      { name: "Tag der Arbeit",   date: on(year,5,1) },
      { name: "Christi Himmelfahrt", date: addDays(easter, +39) },
      { name: "Pfingstmontag",    date: addDays(easter, +50) },
      { name: "Tag der Deutschen Einheit", date: on(year,10,3) },
      { name: "1. Weihnachtstag", date: on(year,12,25) },
      { name: "2. Weihnachtstag", date: on(year,12,26) },
    ];
  }

  // Landes-spezifische
  function stateHolidays(year, st){
    const easter = easterSunday(year);
    const x = [];

    // Heilige Drei Könige – BW, BY, ST
    if (["BW","BY","ST"].includes(st)) x.push({ name:"Heilige Drei Könige", date:on(year,1,6) });

    // Frauentag – BE & MV
    if (["BE","MV"].includes(st)) x.push({ name:"Internationaler Frauentag", date:on(year,3,8) });

    // Fronleichnam – BW, BY, HE, NW, RP, SL (teilweise kommunal in SN/TH – nicht berücksichtigt)
    if (["BW","BY","HE","NW","RP","SL"].includes(st)) x.push({ name:"Fronleichnam", date:addDays(easter,60) });

    // Mariä Himmelfahrt – SL + (vereinfachend) BY
    if (["SL","BY"].includes(st)) x.push({ name:"Mariä Himmelfahrt", date:on(year,8,15) });

    // Reformationstag – BB, MV, SN, ST, TH, SH, NI, HH, HB
    if (["BB","MV","SN","ST","TH","SH","NI","HH","HB"].includes(st)) x.push({ name:"Reformationstag", date:on(year,10,31) });

    // Allerheiligen – BW, BY, NW, RP, SL
    if (["BW","BY","NW","RP","SL"].includes(st)) x.push({ name:"Allerheiligen", date:on(year,11,1) });

    // Buß- und Bettag – nur SN: Mittwoch vor dem 23.11.
    if (st==="SN"){
      // finde Mittwoch vor 23.11.
      const d = on(year,11,23);
      // gehe zurück bis Mittwoch
      while (d.getDay() !== 3) d.setDate(d.getDate()-1);
      x.push({ name:"Buß- und Bettag", date:d });
    }
    return x;
  }

  function getHolidays(year, stateCode){
    const list = [...baseNationwide(year), ...stateHolidays(year, stateCode)];
    // in dateKey-Objekte umwandeln
    return list.map(h => ({ key: dateKeyOf(h.date), name: h.name }));
  }

  // Merged Feiertage als "Appointments" (nur 1 Termin „Feiertag: NAME“, 00:00–23:59)
  function syncHolidaysToAppointments(year, stateCode){
    const map = loadAppointmentsMap();
    const hol = getHolidays(year, stateCode);

    hol.forEach(h => {
      const id = `holiday:${year}:${stateCode}:${h.key}`;
      const arr = map[h.key] || [];
      const exists = arr.some(a => a.id === id);
      if (!exists) {
        arr.push({
          id,
          title: `Feiertag: ${h.name}`,
          start: "00:00",
          end:   "23:59",
          location: stateCode
        });
        map[h.key] = arr;
      }
    });
    saveAppointmentsMap(map);

    // Punkte im Grid aktualisieren (falls sichtbar)
    hol.forEach(h => renderAppointmentDotsForDate && renderAppointmentDotsForDate(h.key));
  }

  // Expose
  window.getHolidays = getHolidays;
  window.syncHolidaysToAppointments = syncHolidaysToAppointments;
})();
