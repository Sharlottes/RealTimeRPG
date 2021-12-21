import { Collection } from "discord.js";

import Help from "./Help";
import Command from "./Command";

const CommandList: Collection<string, Command> = new Collection();
const commands: Command[] = [
    new Help()
];

for(const command of commands) {
    CommandList.set(command.name, command);
}


// 타입스크립트나 모듈 타입으로 코딩할 때 사용하는 내보내기 선언.
// 의외로 쓰다보면 편함.
// require 방식으로 하고 싶으면 이렇게 index 파일 만들지 말고 해당 모듈내에서 export default 혹은 export 해주면 댐.
// 자세한 정보는 help.ts 참고
export default CommandList;

export { default as Command } from "./Command"; // 명령어 인터페이스

export { default as Help } from "./Help";