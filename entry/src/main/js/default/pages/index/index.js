// @ts-nocheck
import geolocation from '@system.geolocation';
import storage from '@system.storage';

var deg2rad = Math.PI / 180.0;

function sin4deg(X) { return Math.sin(X * deg2rad); }
function cos4deg(X) { return Math.cos(X * deg2rad); }
function tan4deg(X) { return Math.tan(X * deg2rad); }
function atan24deg(Y, X) { return Math.atan2(Y, X) / deg2rad; }
function mod360(X) { return X - Math.floor(X / 360.0) * 360.0; }

function padZero(num) {
    return num < 10 ? '0' + num : '' + num;
}

function formatDate(now) {
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return now.getDate() + " " + months[now.getMonth()] + " " + now.getFullYear();
}

function formatCoords(lat, lon) {
    var latVal = parseFloat(lat);
    var lonVal = parseFloat(lon);
    var latDir = latVal >= 0 ? 'N' : 'S';
    var lonDir = lonVal >= 0 ? 'E' : 'W';
    return Math.abs(latVal).toFixed(2) + '°' + latDir + ", " + Math.abs(lonVal).toFixed(2) + '°' + lonDir;
}

var sgnname = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

function formatLongitude(longitude) {
    longitude = mod360(longitude);
    var sgnIdx = Math.floor(longitude / 30.0);
    var deg = Math.floor(longitude - sgnIdx * 30.0);
    var min = Math.floor((longitude - (sgnIdx * 30 + deg)) * 60.0);
    return deg + "° " + sgnname[sgnIdx] + " " + padZero(min) + "'";
}

// ==========================================
// NASA/JPL KEPLERIAN EPHEMERIS ENGINE
// ==========================================

function solveKepler(M_deg, e) {
    var M_rad = M_deg * deg2rad;
    var E = M_rad;
    for (var i = 0; i < 8; i++) {
        var dE = (E - e * Math.sin(E) - M_rad) / (1.0 - e * Math.cos(E));
        E -= dE;
        if (Math.abs(dE) < 1e-6) break;
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

    var x_prime = a * (Math.cos(E) - e);
    var y_prime = a * Math.sqrt(1.0 - e * e) * Math.sin(E);

    var omega = (varpi * deg2rad) - Omega;

    var cos_w = Math.cos(omega);
    var sin_w = Math.sin(omega);
    var cos_O = Math.cos(Omega);
    var sin_O = Math.sin(Omega);
    var cos_I = Math.cos(I);

    var x = (cos_w * cos_O - sin_w * sin_O * cos_I) * x_prime + (-sin_w * cos_O - cos_w * sin_O * cos_I) * y_prime;
    var y = (cos_w * sin_O + sin_w * cos_O * cos_I) * x_prime + (-sin_w * sin_O + cos_w * cos_O * cos_I) * y_prime;
    var z = (sin_w * Math.sin(I)) * x_prime + (cos_w * Math.sin(I)) * y_prime;

    return [x, y, z];
}

function calJD(ye, mo, da, ho, mi) {
    var y0 = (mo > 2) ? ye : (ye - 1);
    var m0 = (mo > 2) ? mo : (mo + 12);
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

function calOblique(T) {
    return 23.439291 - 0.01300416 * T;
}

function calSun(T) {
    var L0 = mod360(280.46646 + 36000.76983 * T);
    var M = mod360(357.52911 + 35999.05029 * T);
    var C = (1.914602 - 0.004817 * T) * sin4deg(M) + (0.019993 - 0.000101 * T) * sin4deg(2 * M) + 0.000289 * sin4deg(3 * M);
    var trueLon = L0 + C;
    var apparentLon = trueLon - 0.00569 - 0.00478 * sin4deg(125.04 - 1934.136 * T);
    return mod360(apparentLon);
}

function calMoon(T) {
    var Lp = mod360(218.3164477 + 481267.88123421 * T);
    var D = mod360(297.8501921 + 445267.1114034 * T);
    var M = mod360(357.5291092 + 35999.0502909 * T);
    var Mp = mod360(134.9633964 + 477198.8675055 * T);
    var F = mod360(93.2720950 + 483202.0175233 * T);

    var l = Lp + 6.288774 * sin4deg(Mp)
    + 1.274027 * sin4deg(2 * D - Mp)
    + 0.658314 * sin4deg(2 * D)
    + 0.213618 * sin4deg(2 * Mp)
    - 0.185116 * sin4deg(M)
    - 0.114332 * sin4deg(2 * F)
    + 0.058793 * sin4deg(2 * D - 2 * Mp)
    + 0.057066 * sin4deg(2 * D - M - Mp)
    + 0.053322 * sin4deg(2 * D + Mp)
    + 0.045758 * sin4deg(2 * D - M);
    return mod360(l);
}

function calGeoPoint(lst, la, obl) {
    var MC = mod360(atan24deg(sin4deg(lst), cos4deg(lst) * cos4deg(obl)));
    var ASCx = cos4deg(lst);
    var ASCy = -(sin4deg(obl) * tan4deg(la)) - cos4deg(obl) * sin4deg(lst);
    var ASC = mod360(atan24deg(ASCx, ASCy));
    return [ASC, MC];
}

// ==========================================
// WATCH APPLICATION LOGIC
// ==========================================

export default {
    data: {
        isLoaded: false,
        isViaCombusta: false,
        textColor: "#ffffff",
        statusText: "Searching GPS...",
        latLonText: "",
        timeText: "",
        dateText: "",
        yanikYolText: "",
        ascText: "",
        mcText: "",
        infoData: [],
        astroData: []
    },

    onInit() {
        this.getDeviceLocation();
    },
    getDeviceLocation() {
        var self = this;
        var finished = false;

        var timer = setTimeout(function () {
            if (!finished) {
                finished = true;
                self.useLastLocation();
            }
        }, 10000);

        try {
            if (!geolocation || typeof geolocation.getLocation !== 'function') {
                clearTimeout(timer);
                self.useLastLocation();
                return;
            }

            geolocation.getLocation({
                success: function (data) {
                    if (finished) {
                        return;
                    }

                    try {
                        if (
                            !data ||
                            data.latitude === undefined ||
                            data.longitude === undefined
                        ) {
                            throw new Error("Invalid Location");
                        }

                        var lat = parseFloat(data.latitude);
                        var lon = parseFloat(data.longitude);

                        if (isNaN(lat) || isNaN(lon)) {
                            throw new Error("Location NaN");
                        }

                        finished = true;
                        clearTimeout(timer);

                        /* SON BAŞARILI GPS KONUMUNU KAYDET */
                        self.saveLastLocation(lat, lon);

                        self.latLonText = formatCoords(lat, lon);
                        self.calculateAstro(lat, lon);

                    } catch (e) {
                        if (!finished) {
                            finished = true;
                            clearTimeout(timer);
                            self.useLastLocation();
                        }
                    }
                },

                fail: function (data, code) {
                    if (finished) {
                        return;
                    }

                    finished = true;
                    clearTimeout(timer);

                    self.useLastLocation();
                },

                complete: function () {
                }
            });

        } catch (e) {
            if (!finished) {
                finished = true;
                clearTimeout(timer);
                self.useLastLocation();
            }
        }
    },

    saveLastLocation(lat, lon) {
        try {
            storage.set({
                key: "lastLatitude",
                value: String(lat),
                success: function () {
                },
                fail: function () {
                }
            });

            storage.set({
                key: "lastLongitude",
                value: String(lon),
                success: function () {
                },
                fail: function () {
                }
            });

        } catch (e) {
        }
    },

    useLastLocation() {
        var self = this;

        try {
            storage.get({
                key: "lastLatitude",

                success: function (latData) {
                    var savedLat = parseFloat(latData);

                    if (isNaN(savedLat)) {
                        self.useFallbackLocation("No saved GPS");
                        return;
                    }

                    storage.get({
                        key: "lastLongitude",

                        success: function (lonData) {
                            var savedLon = parseFloat(lonData);

                            if (isNaN(savedLon)) {
                                self.useFallbackLocation("No saved GPS");
                                return;
                            }

                            self.statusText =
                            "Using last known location...";

                            self.latLonText =
                            formatCoords(savedLat, savedLon);

                            self.calculateAstro(
                                savedLat,
                                savedLon
                            );
                        },

                        fail: function () {
                            self.useFallbackLocation(
                                "No saved GPS"
                            );
                        }
                    });
                },

                fail: function () {
                    self.useFallbackLocation(
                        "No saved GPS"
                    );
                }
            });

        } catch (e) {
            self.useFallbackLocation(
                "Storage Error"
            );
        }
    },

    useFallbackLocation(reason) {
        var self = this;

        self.statusText =
        reason +
        "\nUsing default location...";

        var fallbackLat = 39.9334;
        var fallbackLon = 32.8597;

        self.latLonText =
        formatCoords(
            fallbackLat,
            fallbackLon
        );

        self.calculateAstro(
            fallbackLat,
            fallbackLon
        );
    },

    calculateAstro(latitude, longitude) {
        var now = new Date();
        this.timeText = padZero(now.getHours()) + ":" + padZero(now.getMinutes());
        this.dateText = formatDate(now);
        this.headerText =
        this.timeText +
        "\n" +
        this.dateText +
        "\n" +
        this.latLonText;

        var year = now.getUTCFullYear();
        var month = now.getUTCMonth() + 1;
        var day = now.getUTCDate();
        var hour = now.getUTCHours();
        var minute = now.getUTCMinutes();

        var lat = parseFloat(latitude);
        var lon = parseFloat(longitude);

        var JD = calJD(year, month, day, hour, minute);
        var T = (JD - 2451545.0) / 36525.0;
        var obl = calOblique(T);
        var lst = calLST(JD, lon);

        // ASC & MC
        var angles = calGeoPoint(lst, lat, obl);
        var ascendant = angles[0];
        var mc = angles[1];

        this.ascText = formatLongitude(ascendant);
        this.mcText = formatLongitude(mc);

        var ascSignIdx = Math.floor(ascendant / 30.0);
        var mcSignIdx = Math.floor(mc / 30.0);
        var mcHouse = ((mcSignIdx - ascSignIdx + 12) % 12) + 1;

        // Earth Heliocentric Coordinates
        var earth = getHelioCoords(1.00000011, -0.00000005, 0.01671022, -0.00003804, 0.00005, -0.01300, 100.46435, 36000.76983, 102.94719, 0.32327, 0.0, 0.0, T);

        function getGeoLon(pCoords) {
            var xg = pCoords[0] - earth[0];
            var yg = pCoords[1] - earth[1];
            return mod360(atan24deg(yg, xg));
        }

        // Planetary Positions
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

        // Via Combusta (15° Libra to 15° Scorpio / 195° - 225°)
        var ascInComb = (ascendant >= 195.0 && ascendant <= 225.0);
        var moonInComb = (moonLon >= 195.0 && moonLon <= 225.0);


        if (ascInComb || moonInComb) {
            this.isViaCombusta = true;

            this.yanikYolText = ascInComb
                ? "!!!!! ASC IN VIA COMBUSTA !!!!!"
                : "!!!!! MOON IN VIA COMBUSTA !!!!!";
        } else {
            this.isViaCombusta = false;
            this.yanikYolText = "";
        }

        var list = [];
        // DATE
        list.push({
            name: "Date",
            value: this.dateText,
            color: "#ffffff"
        });

        list.push({
            name: "Location",
            value: this.latLonText,
            color: "#ffffff"
        });

        list.push({
            name: "Ascendant (1st House)",
            value: formatLongitude(ascendant),
            color: (ascInComb || moonInComb) ? "#ff3333" : "#ffffff"
        });

        list.push({
            name: "Midheaven (" + mcHouse + ". House)",
            value: formatLongitude(mc),
            color: (ascInComb || moonInComb) ? "#ff3333" : "#ffffff"
        });

        // Planets & Whole Sign Houses
        var planets = [
            { name: "Sun", lon: sunLon },
            { name: "Moon", lon: moonLon },
            { name: "Mercury", lon: merLon },
            { name: "Venus", lon: venLon },
            { name: "Mars", lon: marLon },
            { name: "Jupiter", lon: jupLon },
            { name: "Saturn", lon: satLon },
            { name: "Uranus", lon: uraLon },
            { name: "Neptune", lon: nepLon },
            { name: "Pluto", lon: pluLon },
            { name: "North Node", lon: nodeLon }
        ];

        for (var i = 0; i < planets.length; i++) {
            var pSignIdx = Math.floor(planets[i].lon / 30.0);
            var houseNum = ((pSignIdx - ascSignIdx + 12) % 12) + 1;

            list.push({
                name: planets[i].name + " (" + houseNum + ". House)",
                value: formatLongitude(planets[i].lon),
                color: this.textColor
            });
        }

        // Whole Sign House Cusps (1st House = 0° of ASC Sign)
        // Whole Sign Houses
        for (var h = 1; h <= 12; h++) {
            var hSignIdx = (ascSignIdx + (h - 1)) % 12;

            list.push({
                name: "House " + h,
                value: sgnname[hSignIdx],
                color: this.textColor
            });
        }

        var displayList = [];

        // VIA COMBUSTA UYARISI
        if (this.isViaCombusta && this.yanikYolText) {
            displayList.push(this.yanikYolText);
        }

        // NORMAL ASTROLOJI VERILERI
        for (var i = 0; i < list.length; i++) {
            displayList.push(
                list[i].name + "    " + list[i].value
            );
        }

        this.astroData = displayList;
        this.isLoaded = true;
    }
};