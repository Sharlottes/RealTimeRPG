export { default as Command } from "./Command"; // 명령어 인터페이스

export { default as Content } from "./Content";
export { default as Test } from "./Test";
export { default as Ping } from "./Ping";
export { default as Login } from "./Login";

// 위까지는 다른 모듈들 정의
// 아래서부턴 명령어 목록 선언

import { Collection } from "discord.js";

import { Command, Content, Test, Ping, Login } from ".";
import Register from "./Register";

const CommandList: Collection<string, Command> = new Collection();
const commands: Command[] = [
    new Content(),
    new Test(),
    new Ping(),
    new Login(),
    new Register()
];

for(const command of commands) {
    CommandList.set(command.name, command);
}


// 타입스크립트나 모듈 타입으로 코딩할 때 사용하는 내보내기 선언.
// 의외로 쓰다보면 편함.
// require 방식으로 하고 싶으면 이렇게 index 파일 만들지 말고 해당 모듈내에서 export default 혹은 export 해주면 댐.
// 자세한 정보는 help.ts 참고
export default CommandList;
