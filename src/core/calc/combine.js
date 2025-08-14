export const mulRange = (a,b)=>({min:(a.min??a)*(b.min??b),max:(a.max??a)*(b.max??b)});
export const prodRanges = (rs)=>rs.reduce((acc,r)=>({min:acc.min*(r.min??r),max:acc.max*(r.max??r)}),{min:1,max:1});
export const addRanges = (rs)=>({min:rs.reduce((s,r)=>s+(r.min??r),0),max:rs.reduce((s,r)=>s+(r.max??r),0)});
