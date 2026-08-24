// @ts-nocheck
import geolocation from '@system.geolocation';
import storage from '@system.storage';

var deg2rad = Math.PI / 180.0;

function sin4deg(x) { return Math.sin(x * deg2rad); }
function cos4deg(x) { return Math.cos(x * deg2rad); }
function tan4deg(x) { return Math.tan(x * deg2rad); }
function atan24deg(y, x) { return Math.atan2(y, x) / deg2rad; }
function mod360(x) { return x - Math.floor(x / 360.0) * 360.0; }
function padZero(num) { return num < 10 ? '0' + num : '' + num; }

function calJD(ye, mo, da, ho, mi) {
    var y0 = (mo > 2) ? ye : ye - 1;
    var m0 = (mo > 2) ? mo : mo + 12;
    var A = Math.floor(y0 / 100);
    var B = 2 - A + Math.floor(A / 4);
    var dayFrac = (ho + mi / 60.0) / 24.0;
    return Math.floor(365.25 * (y0 + 4716)) + Math.floor(30.6001 * (m0 + 1)) + da + dayFrac + B - 1524.5;
}

function calLST(JD, lon) {
    var d = JD - 2451545.0;
    var T = d / 36525.0;
    var gmst = 280.46061837 + 360.98564736629 * d + 0.000387933 * T * T;
    return mod360(gmst + lon);
}

function calOblique(T) { return 23.439291 - 0.01300416 * T; }

function calGeoPoint(lst, lat, obl) {
    var MC = mod360(atan24deg(sin4deg(lst), cos4deg(lst) * cos4deg(obl)));
    var ASCx = cos4deg(lst);
    var ASCy = -(sin4deg(obl) * tan4deg(lat)) - cos4deg(obl) * sin4deg(lst);
    var ASC = mod360(atan24deg(ASCx, ASCy));
    return [ASC, MC];
}

function solveKepler(M_deg, e) {
    var M_rad = M_deg * deg2rad;
    var E = M_rad;
    for (var i = 0; i < 8; i++) {
        var dE = (E - e * Math.sin(E) - M_rad) / (1.0 - e * Math.cos(E));
        E -= dE;
        if (Math.abs(dE) < 0.000001) break;
    }
    return E;
}

function getHelioCoords(a0, a1, e0, e1, I0, I1, L0, L1, w0, w1, node0, node1, T) {
    var a = a0 + a1 * T;
    var e = e0 + e1 * T;
    var I = (I0 + I1 * T) * deg2rad;
    var L = mod360(L0 + L1 * T);
    var varpi = mod360(w0 + w1 * T);
    var Omega = mod360(node0 + node1 * T) * deg2rad;
    var M = mod360(L - varpi);
    var E = solveKepler(M, e);
    var xPrime = a * (Math.cos(E) - e);
    var yPrime = a * Math.sqrt(1.0 - e * e) * Math.sin(E);
    var omega = (varpi * deg2rad) - Omega;
    var cosW = Math.cos(omega), sinW = Math.sin(omega);
    var cosO = Math.cos(Omega), sinO = Math.sin(Omega), cosI = Math.cos(I);
    var x = (cosW * cosO - sinW * sinO * cosI) * xPrime + (-sinW * cosO - cosW * sinO * cosI) * yPrime;
    var y = (cosW * sinO + sinW * cosO * cosI) * xPrime + (-sinW * sinO + cosW * cosO * cosI) * yPrime;
    var z = (sinW * Math.sin(I)) * xPrime + (cosW * Math.sin(I)) * yPrime;
    return [x, y, z];
}

function calSun(T) {
    var L0 = mod360(280.46646 + 36000.76983 * T);
    var M = mod360(357.52911 + 35999.05029 * T);
    var C = (1.914602 - 0.004817 * T) * sin4deg(M)
        + (0.019993 - 0.000101 * T) * sin4deg(2 * M)
        + 0.000289 * sin4deg(3 * M);
    var trueLon = L0 + C;
    return mod360(trueLon - 0.00569 - 0.00478 * sin4deg(125.04 - 1934.136 * T));
}

function calMoon(T) {
    var Lp = mod360(218.3164477 + 481267.88123421 * T);
    var D = mod360(297.8501921 + 445267.1114034 * T);
    var M = mod360(357.5291092 + 35999.0502909 * T);
    var Mp = mod360(134.9633964 + 477198.8675055 * T);
    var F = mod360(93.2720950 + 483202.0175233 * T);
    var lon = Lp
        + 6.288774 * sin4deg(Mp)
        + 1.274027 * sin4deg(2 * D - Mp)
        + 0.658314 * sin4deg(2 * D)
        + 0.213618 * sin4deg(2 * Mp)
        - 0.185116 * sin4deg(M)
        - 0.114332 * sin4deg(2 * F)
        + 0.058793 * sin4deg(2 * D - 2 * Mp)
        + 0.057066 * sin4deg(2 * D - M - Mp)
        + 0.053322 * sin4deg(2 * D + Mp)
        + 0.045758 * sin4deg(2 * D - M);
    return mod360(lon);
}

export default {
    data: {
        isLoaded: false,
        statusText: 'Searching GPS...',
        timeText: '', dateText: '', latText: '', lonText: '',
        bodyColor: '#ffd633',
        slot0Sign: '', slot1Sign: '', slot2Sign: '', slot3Sign: '', slot4Sign: '', slot5Sign: '',
        slot6Sign: '', slot7Sign: '', slot8Sign: '', slot9Sign: '', slot10Sign: '', slot11Sign: '',
        slot0Bodies: [], slot1Bodies: [], slot2Bodies: [], slot3Bodies: [], slot4Bodies: [], slot5Bodies: [],
        slot6Bodies: [], slot7Bodies: [], slot8Bodies: [], slot9Bodies: [], slot10Bodies: [], slot11Bodies: [],
        slot0Color: '#ffffff', slot1Color: '#ffffff', slot2Color: '#ffffff', slot3Color: '#ffffff',
        slot4Color: '#ffffff', slot5Color: '#ffffff', slot6Color: '#ffffff', slot7Color: '#ffffff',
        slot8Color: '#ffffff', slot9Color: '#ffffff', slot10Color: '#ffffff', slot11Color: '#ffffff'
    },

    onInit() {
        this.isLoaded = false;
        this.statusText = 'Searching GPS...';
        this.getDeviceLocation();
    },

    getDeviceLocation() {
        var self = this;
        var finished = false;
        var timer = setTimeout(function () {
            if (finished) return;
            finished = true;
            self.statusText = 'Searching saved GPS...';
            self.useLastLocation();
        }, 10000);

        try {
            if (!geolocation || typeof geolocation.getLocation !== 'function') {
                clearTimeout(timer);
                finished = true;
                self.statusText = 'Searching saved GPS...';
                self.useLastLocation();
                return;
            }

            geolocation.getLocation({
                success: function (data) {
                    if (finished) return;
                    try {
                        if (!data || data.latitude === undefined || data.longitude === undefined) {
                            throw new Error('Invalid Location');
                        }
                        var lat = parseFloat(data.latitude);
                        var lon = parseFloat(data.longitude);
                        if (isNaN(lat) || isNaN(lon)) throw new Error('Location NaN');
                        finished = true;
                        clearTimeout(timer);
                        self.statusText = 'GPS found';
                        self.saveLastLocation(lat, lon);
                        self.calculateForLocation(lat, lon);
                    } catch (e) {
                        if (!finished) {
                            finished = true;
                            clearTimeout(timer);
                            self.statusText = 'Searching saved GPS...';
                            self.useLastLocation();
                        }
                    }
                },
                fail: function () {
                    if (finished) return;
                    finished = true;
                    clearTimeout(timer);
                    self.statusText = 'Searching saved GPS...';
                    self.useLastLocation();
                },
                complete: function () {}
            });
        } catch (e) {
            if (!finished) {
                finished = true;
                clearTimeout(timer);
                self.statusText = 'Searching saved GPS...';
                self.useLastLocation();
            }
        }
    },

    saveLastLocation(lat, lon) {
        try {
            storage.set({ key: 'lastLatitude', value: String(lat), success: function () {}, fail: function () {} });
            storage.set({ key: 'lastLongitude', value: String(lon), success: function () {}, fail: function () {} });
        } catch (e) {}
    },

    useLastLocation() {
        var self = this;
        try {
            storage.get({
                key: 'lastLatitude',
                success: function (latData) {
                    var savedLat = parseFloat(latData);
                    if (isNaN(savedLat)) { self.useFallbackLocation(); return; }
                    storage.get({
                        key: 'lastLongitude',
                        success: function (lonData) {
                            var savedLon = parseFloat(lonData);
                            if (isNaN(savedLon)) { self.useFallbackLocation(); return; }
                            self.statusText = 'Using saved GPS...';
                            self.calculateForLocation(savedLat, savedLon);
                        },
                        fail: function () { self.useFallbackLocation(); }
                    });
                },
                fail: function () { self.useFallbackLocation(); }
            });
        } catch (e) {
            self.useFallbackLocation();
        }
    },

    useFallbackLocation() {
        this.statusText = 'Using Ankara...';
        this.calculateForLocation(39.9334, 32.8597);
    },

    calculateForLocation(latitude, longitude) {
        var now = new Date();
        this.timeText = padZero(now.getHours()) + ':' + padZero(now.getMinutes());
        this.dateText = padZero(now.getDate()) + '.' + padZero(now.getMonth() + 1) + '.' + now.getFullYear();

        var lat = parseFloat(latitude), lon = parseFloat(longitude);
        var latDir = lat >= 0 ? 'N' : 'S';
        var lonDir = lon >= 0 ? 'E' : 'W';
        this.latText = Math.abs(lat).toFixed(2) + latDir;
        this.lonText = Math.abs(lon).toFixed(2) + lonDir;

        var JD = calJD(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes());
        var T = (JD - 2451545.0) / 36525.0;
        var obl = calOblique(T);
        var lst = calLST(JD, lon);
        var angles = calGeoPoint(lst, lat, obl);
        var ascendant = angles[0], mc = angles[1];

        this.bodyColor = (ascendant >= 195.0 && ascendant <= 225.0) ? '#ff3333' : '#ffd633';

        var earth = getHelioCoords(1.00000011, -0.00000005, 0.01671022, -0.00003804, 0.00005, -0.01300,
            100.46435, 36000.76983, 102.94719, 0.32327, 0.0, 0.0, T);

        function getGeoLon(coords) {
            return mod360(atan24deg(coords[1] - earth[1], coords[0] - earth[0]));
        }

        var sunLon = calSun(T);
        var moonLon = calMoon(T);
        var merLon = getGeoLon(getHelioCoords(0.38709893, 0.00000066, 0.20563069, 0.00002527, 7.00487, -0.00594, 252.25084, 149472.67411, 77.45645, 0.16047, 48.33167, -0.12534, T));
        var venLon = getGeoLon(getHelioCoords(0.72333199, 0.00000092, 0.00677323, -0.00004938, 3.39471, -0.00078, 181.97973, 58517.81538, 131.57294, 0.00268, 76.68069, -0.27769, T));
        var marLon = getGeoLon(getHelioCoords(1.52366231, -0.00007221, 0.09341233, 0.00011902, 1.85061, -0.02547, 355.45332, 19140.30268, 336.04084, 0.44441, 49.55740, -0.29252, T));
        var jupLon = getGeoLon(getHelioCoords(5.20336301, 0.00060737, 0.04839266, -0.00012880, 1.30530, -0.00415, 34.40438, 3034.74612, 14.75385, 0.21252, 100.55615, 0.27378, T));
        var satLon = getGeoLon(getHelioCoords(9.53707032, -0.00301530, 0.05415060, -0.00036762, 2.48446, 0.00694, 49.94432, 1222.49362, 92.43194, -0.01893, 113.71504, -0.25767, T));
        var uraLon = getGeoLon(getHelioCoords(19.19126393, 0.00152025, 0.04716771, -0.00019150, 0.76986, -0.00242, 313.23218, 428.48202, 170.96424, 0.40805, 74.22988, 0.04240, T));
        var nepLon = getGeoLon(getHelioCoords(30.06896348, -0.00125196, 0.00858587, 0.00002514, 1.76917, -0.00353, 304.88003, 218.45945, 44.97135, -0.32241, 131.72169, -0.00508, T));
        var pluLon = getGeoLon(getHelioCoords(39.48168677, -0.00313138, 0.24880766, 0.00305531, 17.14175, 0.003075, 238.92881, 145.20780, 224.06676, -0.036736, 110.30347, -0.010278, T));
        var nodeLon = mod360(125.04452 - 1934.136261 * T);

        var shortSigns = ['ARI','TAU','GEM','CAN','LEO','VIR','LIB','SCO','SAG','CAP','AQU','PIS'];

        function getSignColor(signIndex) {
            if (signIndex === 0 || signIndex === 4 || signIndex === 8) return '#ff3333';
            if (signIndex === 1 || signIndex === 5 || signIndex === 9) return '#2ecc71';
            if (signIndex === 2 || signIndex === 6 || signIndex === 10) return '#f1c40f';
            return '#3498db';
        }

        var ascSign = Math.floor(mod360(ascendant) / 30.0);
        var signBodies = [[],[],[],[],[],[],[],[],[],[],[],[]];
        var planetCount = [0,0,0,0,0,0,0,0,0,0,0,0];

        function putBody(longitude, label, countAsPlanet) {
            var normalized = mod360(longitude);
            var sign = Math.floor(normalized / 30.0);
            var degree = Math.floor(normalized - sign * 30.0);
            signBodies[sign].push(label + ' ' + degree + '°');
            if (countAsPlanet) planetCount[sign]++;
        }

        putBody(sunLon, 'SUN', true);
        putBody(moonLon, 'MOON', true);
        putBody(merLon, 'MER', true);
        putBody(venLon, 'VEN', true);
        putBody(marLon, 'MAR', true);
        putBody(jupLon, 'JUP', true);
        putBody(satLon, 'SAT', true);
        putBody(uraLon, 'URA', true);
        putBody(nepLon, 'NEP', true);
        putBody(pluLon, 'PLU', true);
        putBody(nodeLon, 'NODE', true);
        putBody(ascendant, 'ASC', true);
        putBody(mc, 'MC', true);

        var s0=(ascSign+0)%12, s1=(ascSign+1)%12, s2=(ascSign+2)%12, s3=(ascSign+3)%12;
        var s4=(ascSign+4)%12, s5=(ascSign+5)%12, s6=(ascSign+6)%12, s7=(ascSign+7)%12;
        var s8=(ascSign+8)%12, s9=(ascSign+9)%12, s10=(ascSign+10)%12, s11=(ascSign+11)%12;

        function signLabel(signIndex) {
            return planetCount[signIndex] > 1 ? shortSigns[signIndex] + ' *' : shortSigns[signIndex];
        }

        this.slot0Sign=signLabel(s0); this.slot1Sign=signLabel(s1); this.slot2Sign=signLabel(s2); this.slot3Sign=signLabel(s3);
        this.slot4Sign=signLabel(s4); this.slot5Sign=signLabel(s5); this.slot6Sign=signLabel(s6); this.slot7Sign=signLabel(s7);
        this.slot8Sign=signLabel(s8); this.slot9Sign=signLabel(s9); this.slot10Sign=signLabel(s10); this.slot11Sign=signLabel(s11);

        this.slot0Bodies=signBodies[s0]; this.slot1Bodies=signBodies[s1]; this.slot2Bodies=signBodies[s2]; this.slot3Bodies=signBodies[s3];
        this.slot4Bodies=signBodies[s4]; this.slot5Bodies=signBodies[s5]; this.slot6Bodies=signBodies[s6]; this.slot7Bodies=signBodies[s7];
        this.slot8Bodies=signBodies[s8]; this.slot9Bodies=signBodies[s9]; this.slot10Bodies=signBodies[s10]; this.slot11Bodies=signBodies[s11];

        this.slot0Color=getSignColor(s0); this.slot1Color=getSignColor(s1); this.slot2Color=getSignColor(s2); this.slot3Color=getSignColor(s3);
        this.slot4Color=getSignColor(s4); this.slot5Color=getSignColor(s5); this.slot6Color=getSignColor(s6); this.slot7Color=getSignColor(s7);
        this.slot8Color=getSignColor(s8); this.slot9Color=getSignColor(s9); this.slot10Color=getSignColor(s10); this.slot11Color=getSignColor(s11);

        this.isLoaded = true;
    }
};
