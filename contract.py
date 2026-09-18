# WeatherGuard v1.0.0
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json


class WeatherGuard(gl.Contract):
    counter: u256
    reports: TreeMap[str, str]

    def __init__(self):
        self.counter = u256(0)
        self.reports = TreeMap()

    def _normalize_city(self, city: str) -> str:
        value = city.strip()
        if len(value) < 2 or len(value) > 80:
            raise gl.vm.UserError("City name must be between 2 and 80 characters")
        return value

    def _weather_snapshot(self, city: str):
        geo_url = (
            "https://geocoding-api.open-meteo.com/v1/search"
            "?name=" + city.replace(" ", "%20")
            + "&count=1&language=en&format=json"
        )
        geo = gl.nondet.web.request(geo_url, method="GET")
        if geo.status_code >= 400:
            raise gl.vm.UserError("Geocoding service unavailable")
        geo_data = json.loads(geo.body.decode("utf-8"))
        results = geo_data.get("results", [])
        if not results:
            raise gl.vm.UserError("City not found")

        place = results[0]
        lat = float(place["latitude"])
        lon = float(place["longitude"])
        resolved_city = str(place.get("name", city))
        country = str(place.get("country", ""))

        weather_url = (
            "https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            "&current=temperature_2m,relative_humidity_2m,apparent_temperature," 
            "precipitation,rain,weather_code,wind_speed_10m"
            "&hourly=precipitation_probability,temperature_2m"
            "&forecast_days=1&timezone=auto"
        )
        weather = gl.nondet.web.request(weather_url, method="GET")
        if weather.status_code >= 400:
            raise gl.vm.UserError("Weather service unavailable")
        data = json.loads(weather.body.decode("utf-8"))

        current = data.get("current", {})
        hourly = data.get("hourly", {})
        rain_probs = hourly.get("precipitation_probability", [])
        max_rain = max([int(x) for x in rain_probs[:24] if x is not None] or [0])
        temp = float(current.get("temperature_2m", 0))
        wind = float(current.get("wind_speed_10m", 0))
        precipitation = float(current.get("precipitation", 0))

        if max_rain >= 70 or precipitation > 1:
            outdoor = "CAUTION"
        elif max_rain >= 40 or wind >= 35:
            outdoor = "MIXED"
        else:
            outdoor = "GOOD"

        return {
            "city": resolved_city,
            "country": country,
            "latitude": round(lat, 4),
            "longitude": round(lon, 4),
            "temperature_c": round(temp, 1),
            "apparent_temperature_c": round(float(current.get("apparent_temperature", temp)), 1),
            "humidity": int(current.get("relative_humidity_2m", 0)),
            "wind_kmh": round(wind, 1),
            "precipitation_mm": round(precipitation, 2),
            "weather_code": int(current.get("weather_code", 0)),
            "max_rain_probability": max_rain,
            "outdoor_verdict": outdoor,
        }

    def _validator_matches(self, leader_result, independent_result) -> bool:
        if not isinstance(leader_result, gl.vm.Return):
            return False
        leader = leader_result.calldata
        if not isinstance(leader, dict) or not isinstance(independent_result, dict):
            return False
        numeric = [
            ("temperature_c", 1.5),
            ("apparent_temperature_c", 1.5),
            ("humidity", 8),
            ("wind_kmh", 8),
            ("max_rain_probability", 10),
        ]
        for key, tolerance in numeric:
            if key not in leader or key not in independent_result:
                return False
            if abs(float(leader[key]) - float(independent_result[key])) > tolerance:
                return False
        return (
            leader.get("city") == independent_result.get("city")
            and leader.get("country") == independent_result.get("country")
            and leader.get("outdoor_verdict") == independent_result.get("outdoor_verdict")
            and int(leader.get("weather_code", -1)) == int(independent_result.get("weather_code", -2))
        )

    @gl.public.write
    def check_weather(self, city: str) -> str:
        city = self._normalize_city(city)
        report_id = str(self.counter)

        def leader_fn():
            return self._weather_snapshot(city)

        def validator_fn(leader_result):
            try:
                independent = self._weather_snapshot(city)
                return self._validator_matches(leader_result, independent)
            except Exception:
                return False

        snapshot = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        report = {
            "id": report_id,
            "city": snapshot["city"],
            "country": snapshot["country"],
            "latitude": snapshot["latitude"],
            "longitude": snapshot["longitude"],
            "temperature_c": snapshot["temperature_c"],
            "apparent_temperature_c": snapshot["apparent_temperature_c"],
            "humidity": snapshot["humidity"],
            "wind_kmh": snapshot["wind_kmh"],
            "precipitation_mm": snapshot["precipitation_mm"],
            "weather_code": snapshot["weather_code"],
            "max_rain_probability": snapshot["max_rain_probability"],
            "outdoor_verdict": snapshot["outdoor_verdict"],
            "verified": True,
            "source": "Open-Meteo",
        }
        self.reports[report_id] = json.dumps(report)
        self.counter = self.counter + u256(1)
        return report_id

    @gl.public.view
    def get_report(self, report_id: str) -> str:
        value = self.reports.get(report_id)
        if value is None:
            raise gl.vm.UserError("Report not found")
        return value

    @gl.public.view
    def get_latest_id(self) -> str:
        if self.counter == u256(0):
            return ""
        return str(self.counter - u256(1))
