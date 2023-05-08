import axios from 'axios'
import { useRouter } from 'next/router'
import React from 'react'

type Props = {
  className?: string
}

const Header = (props: Props) => {
  const router = useRouter();

  const onLogout = async () => {
    try {
      const data = await axios.post('/api/server-client/logout');
      console.log(data);
    } catch (err) {
      console.error(err)
    }

  }

  return (
    <div className='flex justify-between m-4'>
      <button
        type="button"
        className={`inline-block rounded bg-slate-600 px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-white`}
        onClick={() => router.replace("/")}>
        Home
      </button>
      <button
        type="button"
        className={`inline-block rounded bg-slate-600 px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-white`}
        onClick={() => router.push("/login")}>
        Login
      </button>
      <button
        type="button"
        className={`inline-block rounded bg-slate-600 px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-white`}
        onClick={onLogout}>
        Logout
      </button>
      <button
        className="inline-block rounded bg-slate-600 px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-white"
        onClick={() => router.push('/documents')}>
        Documents List
      </button>
    </div>
  )
}

export default Header