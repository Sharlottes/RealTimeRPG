import Canvass from 'canvas';
import { Mathf } from './Mathf';

export class Canvas {
  //TODO: 100/100 상태에서 빈칸이 보임
  public static unicodeProgressBar(progress: number, max: number, showPercent = false) {
    const per = Mathf.clamp(progress / max);

    let bar = "";
    for(let i = 0; i < 9; i++) bar += per > i / 10 ? "\u2588" : "\u2591";

    bar += ["\u2591", "\u258f", "\u258e", "\u258d", "\u258c", "\u258b", "\u258a", "\u2589", "\u2588"][Mathf.clamp(Math.floor(per/8), 0, 8)];
    if(showPercent) bar += `  (${(per * 100).toFixed(2)}%`;

    return bar;
  }

  public static donutProgressBar(canvas: Canvass.Canvas, options: {
    progress: {max: number, now: number}, 
    bar: number | {
      width: number,
      style?: string | CanvasGradient | CanvasPattern
    },
    font: string | {
      text: string,
      font?: string,
      style?: string | CanvasGradient | CanvasPattern
    },
    sideFont: string | {
      text: string,
      font?: string,
      style?: string | CanvasGradient | CanvasPattern
    },
  }) {
    const { bar, font, sideFont } = options;
    const barWidth = typeof bar === 'number' ? bar : bar.width;
    const barStyle = typeof bar === 'number' ? "#49f" : bar.style||"#49f";

    const mainText = typeof font === 'string' ? font : font.text;
    const mainStyle = typeof font === 'string' ? "#F47C7C" : font.style||"#F47C7C";
    const mainFont = typeof font === 'string' ? "40px Arial" : font.font||"40px Arial";

    const subText = typeof sideFont === 'string' ? sideFont : sideFont.text;
    const subStyle = typeof sideFont === 'string' ? "#F47C7C" : sideFont.style||"#F47C7C";
    const subFont = typeof sideFont === 'string' ? "40px Arial" : sideFont.font||"40px Arial";

    const context = canvas.getContext('2d');
    const centerX = canvas.width / 2, centerY = canvas.height / 2;
    const rad = (Math.min(canvas.width, canvas.height)-barWidth)/2;
    const progress = options.progress.now/options.progress.max;
      
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.beginPath();
    context.strokeStyle = "#A5DEF1";
    context.lineWidth = barWidth;
    context.arc(centerX, centerY, rad, 0, Math.PI * 2, false);
    context.stroke();
    context.closePath();
    
    context.fillStyle = mainStyle;
    context.font = mainFont;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`${mainText} ${(progress*100).toFixed()}%`, centerX, centerY);

    context.fillStyle = subStyle;
    context.font = subFont;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`${subText} ${options.progress.now}/${options.progress.max}`, centerX, centerY+rad/2);

    context.beginPath();
    context.strokeStyle = barStyle;
    context.lineWidth = barWidth;
    context.arc(centerX, centerY, rad, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2, false);
    context.stroke();

    return context;
  }
}
