import User from "./User";

export default class Alert {
  constructor(
    public readonly content: string,
    public readonly lifetime: number = -1,
  ) {}

  public send(user: User) {
    user.addAlert(this);
  }
}
