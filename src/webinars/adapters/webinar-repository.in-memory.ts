//dépôt des webinaires
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { IWebinarRepository } from 'src/webinars/ports/webinar-repository.interface';

export class InMemoryWebinarRepository implements IWebinarRepository {
  constructor(public database: Webinar[] = []) {}

  async create(webinar: Webinar): Promise<void> {
    this.database.push(webinar);
  }

  async findById(id: string): Promise<Webinar | null> {
    const webinar = this.database.find((webinar) => webinar.props.id === id);
    return webinar || null; // Retourne null si aucun webinaire n'est trouvé
  }
}

