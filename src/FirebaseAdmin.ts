import firebase from "firebase-admin"
import { Auth } from "firebase-admin/auth"

import { Account } from "./auth"

import config from "./sdk.json"

class FirebaseAdmin {
    public readonly app: firebase.app.App;
    public readonly database: firebase.database.Database;
    public readonly auth: Auth;

    public readonly accounts: Map<string, Account>;

    public constructor() {
        this.app = firebase.initializeApp(config);

        this.database = firebase.database(this.app);
        this.auth = firebase.auth(this.app);

        this.accounts = new Map<string, Account>();
    }
}

export default new FirebaseAdmin();