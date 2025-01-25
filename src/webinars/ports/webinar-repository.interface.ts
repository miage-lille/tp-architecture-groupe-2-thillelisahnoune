//Définit comment interagir avec le dépôt des webinaires 
import { Webinar } from 'src/webinars/entities/webinar.entity';

export interface IWebinarRepository {
  create(webinar: Webinar): Promise<void>;
  findById(id: string): Promise<Webinar | null>; 
}
