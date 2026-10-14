import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Oya — Meet your people',description:'A little hello. A whole new connection. Text and video chat made for Nigeria. 18+.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
