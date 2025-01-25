import { IMailer } from 'src/core/ports/mailer.interface';
import { InMemoryParticipationRepository } from 'src/webinars/adapters/participation-repository.in-memory';
import { InMemoryWebinarRepository } from 'src/webinars/adapters/webinar-repository.in-memory';
import { InMemoryUserRepository } from 'src/users/adapters/user-repository.in-memory';
import { User } from 'src/users/entities/user.entity';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { Participation } from 'src/webinars/entities/participation.entity';
import { BookSeat } from './book-seat'; // le cas à tester

describe('Use case : Réserver une place', () => {
    //Déclaration des variables globales
  let participationRepository: InMemoryParticipationRepository;
  let webinarRepository: InMemoryWebinarRepository;
  let userRepository: InMemoryUserRepository;
  let mailer: IMailer;
  let useCase: BookSeat;

  const user = new User({
    id: 'user-1',
    email: 'user@example.com',
    password: 'password',
  });

  const webinar = new Webinar({
    id: 'webinar-1',
    organizerId: 'organizer-1',
    title: 'Test Webinar',
    startDate: new Date('2025-01-10T10:00:00.000Z'),
    endDate: new Date('2025-01-10T11:00:00.000Z'),
    seats: 10,
  });

  beforeEach(() => {
    participationRepository = new InMemoryParticipationRepository();
    webinarRepository = new InMemoryWebinarRepository();
    userRepository = new InMemoryUserRepository();
    mailer = {
      send: jest.fn(),
    } as unknown as IMailer;

    useCase = new BookSeat(participationRepository, userRepository, webinarRepository, mailer);

    // Ajout du webinaire et l'organisateur aux repositories 
    webinarRepository.database.push(webinar);

    // Ajout de l'utilisateur "organizer-1" aux utilisateurs
    const organizer = new User({
      id: 'organizer-1',
      email: 'organizer-1@example.com',
      password: 'password',
    });

    userRepository.database.push(organizer);
    userRepository.database.push(user); // Ajout du participant
  });

  describe('Scenario: happy path', () => {
    it('Doit réserver une place et en informer l\'organisateur', async () => {
      // Act: Appel du cas d'utilisation
      await useCase.execute({ webinarId: 'webinar-1', user });

      // Assert: Vérifier que la participation a été ajoutée
      const participations = await participationRepository.findByWebinarId('webinar-1');
      expect(participations).toHaveLength(1); // Vérifie qu'une seule participation a été ajoutée

      // Vérifier que l'email a bien été envoyé
      expect(mailer.send).toHaveBeenCalledWith({
        to: 'organizer-1@example.com',
        subject: 'New participant for webinar: Test Webinar',
        body: 'User user@example.com has booked a seat in your webinar.',
      });
    });
  });

  describe('Scenario: webinar complet', () => {
    it('Doit générer une erreur si aucune place n\'est disponible', async () => {
      // Boucle: Ajout des participations pour remplir le webinaire
      for (let i = 0; i < 10; i++) {
        await participationRepository.save(
          new Participation({ userId: `user-${i + 2}`, webinarId: 'webinar-1' }),
        );
      }

      // Act & Assert: Essayer de réserver une place et voire l'erreur
      await expect(useCase.execute({ webinarId: 'webinar-1', user })).rejects.toThrow(
        'No seats available',
      );
    });
  });

  describe('Scenario: Utilisateur déja inscrit', () => {
    it('Doit générer une erreur si l\'utilisateur est déjà inscrit', async () => {
      // Ajout: Ajout d'une participation pour l'utilisateur
      await participationRepository.save(new Participation({ userId: 'user-1', webinarId: 'webinar-1' }));

      // Act & Assert: Essayer de réserver une place et voir une erreur
      await expect(useCase.execute({ webinarId: 'webinar-1', user })).rejects.toThrow(
        'User is already participating in this webinar',
      );
    });
  });

  describe('Scenario: Le webinair n\'existe pas', () => {
    it('Doit générer une erreur si le webinaire n\'existe pas', async () => {
      // Act & Assert: Essayer de réserver une place pour un webinaire inexistant
      await expect(useCase.execute({ webinarId: 'non-existent-id', user })).rejects.toThrow(
        'Webinar not found',
      );
    });
  });

  describe('Scenario: L\'organisateur n\'existe pas', () => {
    it('Ne doit pas envoyer d\'e-mail si l\'organisateur n\'existe pas', async () => {
      // Arrange: Supprimer l'organisateur du repository
      webinar.props.organizerId = 'non-existent-organizer';

      // Act: Appel du cas d'utilisation
      await useCase.execute({ webinarId: 'webinar-1', user });

      // Assert: Vérifier que l'email n'a pas été envoyé
      expect(mailer.send).not.toHaveBeenCalled();
    });
  });
});
