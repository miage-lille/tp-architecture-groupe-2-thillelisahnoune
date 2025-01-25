import { Executable } from 'src/shared/executable';
import { IMailer } from 'src/core/ports/mailer.interface';
import { IUserRepository } from 'src/users/ports/user-repository.interface';
import { IParticipationRepository } from 'src/webinars/ports/participation-repository.interface';
import { IWebinarRepository } from 'src/webinars/ports/webinar-repository.interface';
import { Participation } from 'src/webinars/entities/participation.entity';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { User } from 'src/users/entities/user.entity';

type Request = {
  webinarId: string;
  user: User;
};
type Response = void;

export class BookSeat implements Executable<Request, Response> {
  constructor(
    private readonly participationRepository: IParticipationRepository,
    private readonly userRepository: IUserRepository,
    private readonly webinarRepository: IWebinarRepository,
    private readonly mailer: IMailer,
  ) {}

  async execute({ webinarId, user }: Request): Promise<Response> {
    // Fetch webinar
    const webinar = await this.webinarRepository.findById(webinarId);
    if (!webinar) {
      throw new Error('Webinar not found');
    }

    // Check if user is already a participant
    const participations = await this.participationRepository.findByWebinarId(webinarId);
    const isAlreadyParticipant = participations.some(
      (participation) => participation.props.userId === user.props.id
    );
    if (isAlreadyParticipant) {
      throw new Error('User is already participating in this webinar');
    }

    // Check if there are seats available
    if (participations.length >= webinar.props.seats) {
      throw new Error('No seats available');
    }

    // Save participation
    const participation = new Participation({
      userId: user.props.id,
      webinarId: webinarId,
    });
    await this.participationRepository.save(participation);

    // Notify organizer
    const organizer = await this.userRepository.findById(webinar.props.organizerId);
    if (organizer) {
      await this.mailer.send({
        to: organizer.props.email,
        subject: `New participant for webinar: ${webinar.props.title}`,
        body: `User ${user.props.email} has booked a seat in your webinar.`,
      });
    }
  }
}
