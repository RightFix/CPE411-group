export type Student = {
  id: number;
  name: string;
  regNo: string;
};

export const students: Student[] = [
  { id: 1, name: "NATHANS, CHIDERA DANIELLA", regNo: "22/EG/CO/1631" },
  { id: 2, name: "AKPAN, DAVID ENIEFIOK", regNo: "22/EG/CO/1632" },
  { id: 3, name: "OGBOETO, ALSWELL GODSPOWER", regNo: "22/EG/CO/1633" },
  { id: 4, name: "EGUAIKHE, ESTHER IKPEMIOSIME", regNo: "22/EG/CO/1634" },
  { id: 5, name: "OKPOSIN, EDIDIONG SAMUEL", regNo: "22/EG/CO/1635" },
  { id: 6, name: "IBE, EMMANUEL IKECHUKWU", regNo: "22/EG/CO/1636" },
  { id: 7, name: "OLAWOLE, OLUWASEGUN OLANIYI", regNo: "22/EG/CO/1637" },
  { id: 8, name: "BASSEY, DONALD DASIL", regNo: "22/EG/CO/1638" },
  { id: 9, name: "GEORGE, VICTOR SOLOMON", regNo: "22/EG/CO/1639" },
  { id: 10, name: "UMO, DAVID EDEM", regNo: "22/EG/CO/1640" },
  { id: 11, name: "IBEH, CHARLES CHINEDU", regNo: "22/EG/CO/1641" },
  { id: 12, name: "WILLS, EMEM INI", regNo: "22/EG/CO/1642" },
  { id: 13, name: "PETER, FAITH EMEM", regNo: "22/EG/CO/1643" },
  { id: 14, name: "ITA, GODSGIFT SIMEON", regNo: "22/EG/CO/1644" },
  { id: 15, name: "OKORN, OKADIM OKADIM", regNo: "22/EG/CO/1645" },
  { id: 16, name: "IKPEME, ODUDUABASI NAPOLEON", regNo: "22/EG/CO/1646" },
  { id: 17, name: "EKWERE, DAVID ANIEKAN", regNo: "22/EG/CO/1647" },
  { id: 18, name: "PETER, MFONISO ANIEKAN", regNo: "23/EG/CO/001" },
  { id: 19, name: "ΕΤΟΝ, ΤΟΥO-ABASI BILLY", regNo: "23/EG/CO/002" },
  { id: 20, name: "INAMETI, MERCY ETIM", regNo: "23/EG/CO/003" },
  { id: 21, name: "EBONG, NSIKANABASI SAMUEL", regNo: "23/EG/CO/004" },
  { id: 22, name: "INIMA, FREEDOM INIMA", regNo: "23/EG/CO/005" },
  { id: 23, name: "OKON, IMOH DANIEL", regNo: "23/EG/CO/006" },
  { id: 24, name: "ОВОНО, ЕВENEZER EMMANUEL", regNo: "23/EG/CO/007" },
  { id: 25, name: "UYEH, SAMUEL JOHN", regNo: "23/EG/CO/008" },
  { id: 26, name: "ESSIEN, UBONG BASSEY", regNo: "23/EG/CO/009" },
  { id: 27, name: "LIBANG, SUCCESS OBI", regNo: "23/EG/CO/010" },
  { id: 28, name: "MICHAEL, KUBIATABASI EDET", regNo: "23/EG/CO/011" },
  { id: 29, name: "ABRAHAM, ABRAHAM LAWRENCE", regNo: "23/EG/CO/012" },
  { id: 30, name: "MARK, EMMANUEL PHILIP", regNo: "23/EG/CO/013" },
  { id: 31, name: "UDE, RIGHTEOUSNESS NWANNENNAYA", regNo: "23/EG/CO/014" },
  { id: 32, name: "PETER, JUSTICE EMMANUEL", regNo: "23/EG/CO/015" },
  { id: 33, name: "ITA, LOUIS MICHAEL", regNo: "23/EG/CO/016" },
  { id: 34, name: "WILSON, ISREAL OKON", regNo: "23/EG/CO/017" },
  { id: 35, name: "IKECHUKWU, PRAISE ORJI", regNo: "23/EG/CO/018" },
  { id: 36, name: "BASSEY, SHINE JOSEΡΗ", regNo: "23/EG/CO/019" },
  { id: 37, name: "OBOT, ABASI-IFREKE UKPONG", regNo: "23/EG/CO/020" },
];

export const studentsByRegNo = [...students].sort((a, b) => a.regNo.localeCompare(b.regNo));
