import { Routes } from '@angular/router';
import { Home } from './features/home/home';
import { Chapter } from './features/chapter/chapter';
import { Contacts } from './features/contacts/contacts';




export const routes: Routes = [
    {
        path: '', component: Home,
    },
    {
        path: 'contactos', component: Contacts,
    },
    {
        path: ':slug', component: Chapter
    },
    {
        path: '**',
        redirectTo: ''
    }
];
