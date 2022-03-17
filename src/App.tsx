import { useState, useRef } from 'react';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import './App.scss';

dayjs.extend(localizedFormat);

type Coordinates = {
	lat: number;
	lon: number;
};

type Weather = {
	main?: string;
	description?: string;
	temp_min?: string;
	temp_max?: string;
	humidity?: string;
};

type PastWeathers = {
	saved: { city: string; country: string; date: string };
	index: number;
};

type Lat = Coordinates['lat'];
type Lon = Coordinates['lon'];

const API_KEY = process.env.REACT_APP_OPEN_WEATHER_KEY;
const LOCAL_STORAGE_KEY = 'past_weathers';

async function fetchLatLon(location: string): Promise<Coordinates | null> {
	const url = `http://api.openweathermap.org/geo/1.0/direct?q=${location}&limit=5&appid=${API_KEY}`;

	try {
		const response = await fetch(url);
		const data = await response.json();
		const { lat, lon } = data[0];
		return { lat, lon };
	} catch (error) {
		return null;
	}
}

async function fetchCurrentWeather(
	lat: Lat,
	lon: Lon
): Promise<{ [key: string]: any } | null> {
	const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;

	try {
		const response = await fetch(url);
		const { weather, main } = await response.json();
		return { weather, main };
	} catch (error) {
		return null;
	}
}

function App() {
	const pastWeathers = localStorage.getItem(LOCAL_STORAGE_KEY);

	const [weather, setWeather] = useState<Weather>({});
	const [errorMsg, setErrorMsg] = useState('');
	const [searchWeathers, setSearchWeathers] = useState(pastWeathers);

	const location = useRef({ city: '', country: '' });
	const inputCity = useRef<HTMLInputElement>(null);
	const inputCountry = useRef<HTMLInputElement>(null);

	const displayError = (msg = 'Not Found'): void => {
		setErrorMsg(msg);
		handleOnClear();
	};

	const transformCityCountry = ({
		city,
		country,
	}: {
		city: string;
		country: string;
	}) => {
		if (city && country) {
			return `${city}, ${country.toUpperCase()}`;
		}

		if (city) {
			return `${city}`;
		}

		return '';
	};

	const handleOnSearch = async () => {
		const formatCityAndCountry = [
			inputCity?.current?.value,
			inputCountry?.current?.value,
		];

		if (!inputCity?.current?.value) {
			displayError('Please input city');
			return;
		}

		const latLonData = await fetchLatLon(formatCityAndCountry.join());

		if (!latLonData) {
			displayError();
			return;
		}

		const { lat, lon } = latLonData;

		const weatherData = await fetchCurrentWeather(lat, lon);

		if (!weatherData) {
			displayError('Invalid Weather');
			return;
		}

		const { weather, main } = weatherData;

		const formatWeatherMain = { ...weather[0], ...main };

		const includeTime = { ...location.current, date: new Date() };
		let formatPastWeathers = [includeTime];

		if (pastWeathers) {
			const weatherJSON = JSON.parse(pastWeathers);
			formatPastWeathers = [...weatherJSON, includeTime];
		}

		localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formatPastWeathers));

		const updatedPastWeathers = localStorage.getItem(LOCAL_STORAGE_KEY);

		setWeather(formatWeatherMain);
		setSearchWeathers(updatedPastWeathers);
		setErrorMsg('');
	};

	const handleOnClear = () => {
		setWeather({});
		location.current = { city: '', country: '' };

		if (inputCountry.current) {
			inputCountry.current.value = '';
		}

		if (inputCity.current) {
			inputCity.current.value = '';
		}
	};

	const handleSearchHistory = (data: PastWeathers['saved']) => {
		location.current.city = data.city;
		location.current.country = data.country;

		if (inputCountry.current) {
			inputCountry.current.value = data.country;
		}

		if (inputCity.current) {
			inputCity.current.value = data.city;
		}

		handleOnSearch();
	};

	const handleDeleteHistory = (index: number) => {
		if (pastWeathers) {
			const parseWeathers = JSON.parse(pastWeathers);
			parseWeathers.splice(index, 1);
			localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parseWeathers));
		}

		const updatedPastWeathers = localStorage.getItem(LOCAL_STORAGE_KEY);
		setSearchWeathers(updatedPastWeathers);
	};

	return (
		<div>
			<h1>Today's Weather</h1>
			<hr />
			<div className='input-location'>
				<label htmlFor='city'>City: </label>
				<input
					type='text'
					name='city'
					id='city'
					ref={inputCity}
					onChange={(e) => {
						location.current.city = e.target.value;
					}}
				/>
				<label htmlFor='country'>Country: </label>
				<input
					type='text'
					name='country'
					id='country'
					maxLength={2}
					minLength={2}
					ref={inputCountry}
					onChange={(e) => {
						location.current.country = e.target.value;
					}}
				/>
				<input type='button' value='Search' onClick={handleOnSearch} />
				<input type='button' value='Clear' onClick={handleOnClear} />
			</div>
			<div className='weather-info'>
				{Object.keys(weather).length === 0 ? null : (
					<>
						<p>{transformCityCountry(location.current)}</p>
						<h1>{weather.main}</h1>
						<table>
							<tbody>
								<tr>
									<td>Description: </td>
									<td>{weather.description}</td>
								</tr>
								<tr>
									<td>Temperature: </td>
									<td>
										{weather.temp_min}°C ~ {weather.temp_max}°C
									</td>
								</tr>
								<tr>
									<td>Humidity: </td>
									<td>{weather.humidity}%</td>
								</tr>
								<tr>
									<td>Time: </td>
									<td>{`${dayjs(new Date()).format('YYYY-MM-DD LTS')}`}</td>
								</tr>
							</tbody>
						</table>
					</>
				)}
				{errorMsg && <p className='error'>{errorMsg}</p>}
			</div>

			<div>
				<h1>Search History</h1>
				<hr />
				{searchWeathers &&
					JSON.parse(searchWeathers).map(
						(saved: PastWeathers['saved'], index: PastWeathers['index']) => {
							return (
								<div className='search-history' key={saved.date}>
									<p>
										<span>{index + 1}.</span> {transformCityCountry(saved)}
									</p>
									<p className='search-history-details'>
										<time>{dayjs(saved.date).format('LTS')}</time>
										<input
											type='button'
											value='Search'
											onClick={() => {
												handleSearchHistory(saved);
											}}
										/>
										<input
											type='button'
											value='Delete'
											onClick={() => {
												handleDeleteHistory(index);
											}}
										/>
									</p>
								</div>
							);
						}
					)}
			</div>
		</div>
	);
}

export default App;
