import { HttpException, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(private httpService: HttpService) {}

  async getCurrentWeather(city: string) {
    const params = {
      q: city,
      appid: process.env['OPENWEATHER_API_KEY'] || '',
    };

    const { data } = await firstValueFrom(
      this.httpService
        .get('https://api.openweathermap.org/data/2.5/weather', { params })
        .pipe(
          catchError((error: AxiosError) => {
            const message = error?.response?.data || {
              message: 'Unknown error',
            };
            this.logger.error(message);
            throw new HttpException(message, error?.response?.status || 500);
          }),
        ),
    );

    return data;
  }
}
