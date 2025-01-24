document.addEventListener('DOMContentLoaded', () => {
    // Add mobile nav toggle functionality
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  
    // Close mobile nav when clicking outside
    document.addEventListener('click', (e) => {
      if (!navToggle.contains(e.target) && !navLinks.contains(e.target) && navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
      }
    });
  
    const searchInput = document.getElementById('search');
    const searchBtn = document.getElementById('searchBtn');
    const citySuggestions = document.getElementById('city-suggestions');
    
    // Cache for city suggestions
    let citiesCache = new Set();
    
    // Default city on load
    getWeatherData('London');
    
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    });
  
    // Add input event listener for search suggestions
    searchInput.addEventListener('input', debounce(async (e) => {
      const input = e.target.value.trim();
      
      if (input.length < 3) {
        citySuggestions.innerHTML = '';
        return;
      }
      
      try {
        const suggestions = await getCitySuggestions(input);
        updateSuggestions(suggestions);
      } catch (error) {
        console.error('Error getting suggestions:', error);
      }
    }, 300));
  });
  
  // Debounce function to limit API calls
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  async function getCitySuggestions(input) {
    try {
      const response = await fetch(
        `${BASE_URL}/find?q=${input}&type=like&sort=population&cnt=5&appid=${API_KEY}`
      );
      const data = await response.json();
      
      if (data.count === 0) return [];
      
      return data.list.map(city => ({
        name: city.name,
        country: city.sys.country
      }));
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }
  }
  
  function updateSuggestions(suggestions) {
    const datalist = document.getElementById('city-suggestions');
    datalist.innerHTML = '';
    
    suggestions.forEach(city => {
      const option = document.createElement('option');
      option.value = `${city.name}, ${city.country}`;
      datalist.appendChild(option);
    });
  }
  
  function handleSearch() {
    const city = document.getElementById('search').value.trim();
    
    if (!city) {
      alert('Please enter a city name');
      return;
    }
    
    getWeatherData(city);
  }
  
  async function getWeatherData(query) {
    try {
      if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
        throw new Error('Please set your API key in config.js');
      }
  
      // Get current weather
      const currentWeatherResponse = await fetch(
        `${BASE_URL}/weather?q=${query}&units=metric&appid=${API_KEY}`
      );
      const currentWeatherData = await currentWeatherResponse.json();
      
      if (currentWeatherData.cod === '404') {
        throw new Error('City not found');
      }
      
      // Get 5-day forecast
      const forecastResponse = await fetch(
        `${BASE_URL}/forecast?q=${query}&units=metric&appid=${API_KEY}`
      );
      const forecastData = await forecastResponse.json();
      
      updateCurrentWeather(currentWeatherData);
      updateForecast(forecastData);
      
    } catch (error) {
      if (error.message === 'Please set your API key in config.js') {
        alert(error.message);
      } else {
        alert('Error fetching weather data. Please try again.');
      }
      console.error('Error:', error);
    }
  }
  
  function updateCurrentWeather(data) {
    document.querySelector('.city-name').textContent = `${data.name}, ${data.sys.country}`;
    document.getElementById('temp').textContent = Math.round(data.main.temp);
    document.getElementById('description').textContent = data.weather[0].description;
    document.getElementById('humidity').textContent = data.main.humidity;
    document.getElementById('wind').textContent = Math.round(data.wind.speed * 3.6); // Convert m/s to km/h
    document.getElementById('pressure').textContent = data.main.pressure;
    
    // Update weather icon
    const weatherIcon = document.getElementById('weather-icon');
    weatherIcon.className = `fas ${getWeatherIcon(data.weather[0].id)}`;
  }
  
  function updateForecast(data) {
    const forecastContainer = document.getElementById('forecast');
    forecastContainer.innerHTML = '';
    
    const dailyForecasts = data.list.filter(forecast => 
      forecast.dt_txt.includes('12:00:00')
    ).slice(0, 5);
    
    dailyForecasts.forEach(forecast => {
      const date = new Date(forecast.dt * 1000);
      const card = document.createElement('div');
      card.className = 'forecast-card';
      card.innerHTML = `
        <div class="date">${formatDate(date)}</div>
        <i class="fas ${getWeatherIcon(forecast.weather[0].id)}"></i>
        <div class="temp">${Math.round(forecast.main.temp)}°C</div>
        <div class="description">${forecast.weather[0].description}</div>
      `;
      forecastContainer.appendChild(card);
    });
  }
  
  function formatDate(date) {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }
  
  function getWeatherIcon(code) {
    // Map weather codes to Font Awesome icons
    if (code >= 200 && code < 300) return 'fa-bolt';
    if (code >= 300 && code < 400) return 'fa-cloud-rain';
    if (code >= 500 && code < 600) return 'fa-rain';
    if (code >= 600 && code < 700) return 'fa-snowflake';
    if (code >= 700 && code < 800) return 'fa-smog';
    if (code === 800) return 'fa-sun';
    if (code > 800) return 'fa-cloud';
    return 'fa-question';
  }